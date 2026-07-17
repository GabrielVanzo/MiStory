"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import type { PlayerDTO, RoomState, RoundSecret } from "@/lib/realtime/events";
import type { AnswerValue, FinishOutcome } from "@/types/game";
import { joinRoom, realtimeErrorMessage } from "@/lib/realtime/actions";
import { clearIdentity, loadIdentity, saveIdentity } from "@/lib/realtime/identity";
import { getSocket } from "@/lib/realtime/socket";

/**
 * `unreachable` exists because a realtime server that is simply down used to
 * leave the room stuck on the loading skeleton forever — no error, no retry.
 */
type Phase = "loading" | "needs-join" | "joined" | "closed" | "unreachable";
type Connection = "connecting" | "connected" | "reconnecting";

interface RoomContextValue {
  code: string;
  phase: Phase;
  connection: Connection;
  room: RoomState | null;
  me: PlayerDTO | null;
  /** Room owner: controls start round / restart match. */
  isHost: boolean;
  /** The narrator of the current round (rotates each round). */
  isMaster: boolean;
  /** Round created but the master hasn't pressed Iniciar — clock not running. */
  isWaiting: boolean;
  /** Clock frozen because a guess is awaiting the master's verdict. */
  isPaused: boolean;
  /** Whether it is my turn to ask a question. */
  isMyTurn: boolean;
  /** True once my guess was rejected — I'm out of this round. */
  amEliminated: boolean;
  /**
   * The round's answer + pending guess texts. Only ever populated for the
   * MASTER — the server never sends `round:secret` to anyone else.
   */
  secret: RoundSecret | null;
  /** Server clock minus local clock (ms). Feeds the countdown. */
  offsetMs: number;
  /** True while a match action (start/finish/restart) is in flight. */
  busy: boolean;
  error: string | null;
  join: (nickname: string) => Promise<void>;
  /** Retry after the server was unreachable. */
  retry: () => void;
  leave: () => Promise<void>;
  startRound: () => Promise<void>;
  /** Master-only: start the clock on the waiting round. */
  beginRound: () => Promise<void>;
  finishRound: (outcome: FinishOutcome, solvedById?: string) => Promise<void>;
  restartMatch: () => Promise<void>;
  /** Ask a question (only on your turn). Returns true on success. */
  askQuestion: (content: string) => Promise<boolean>;
  /** Skip your turn without asking. */
  passTurn: () => Promise<void>;
  answerQuestion: (questionId: string, value: AnswerValue) => Promise<void>;
  /** Master-only: release the next unlocked hint to the detectives. */
  releaseHint: () => Promise<void>;
  /** Submit this player's single secret shot at the solution. */
  submitGuess: (content: string) => Promise<boolean>;
  /** Master-only: accept (ends the round) or reject (eliminates the guesser). */
  resolveGuess: (guessId: string, accept: boolean) => Promise<void>;
}

/**
 * Fills in round fields that a slightly-older realtime server might omit. The
 * client and the socket server deploy separately (Vercel vs Fly), so a brief
 * version skew is normal — it must degrade (a feature quietly missing) instead
 * of crashing the whole room on `undefined.length`.
 */
function normalizeRoom(room: RoomState): RoomState {
  const round = room.round;
  if (!round) return room;
  return {
    ...room,
    round: {
      ...round,
      questions: round.questions ?? [],
      guesses: round.guesses ?? [],
      hints: round.hints ?? [],
      hintsAvailable: round.hintsAvailable ?? 0,
    },
  };
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used within a RoomProvider");
  return ctx;
}

export function RoomProvider({ code, children }: { code: string; children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [connection, setConnection] = useState<Connection>("connecting");
  const [room, setRoom] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [secret, setSecret] = useState<RoundSecret | null>(null);
  const [offsetMs, setOffsetMs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  // Reclaim an existing seat by its stored token (initial load & reconnects).
  const resume = useCallback(
    async (token: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const res = await joinRoom({ code, nickname: "", sessionToken: token });
        saveIdentity({ code, playerId: res.playerId, sessionToken: res.sessionToken });
        setPlayerId(res.playerId);
        setRoom(normalizeRoom(res.room));
        setPhase("joined");
        setError(null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "INTERNAL";
        clearIdentity(code);
        setPhase(msg === "ROOM_NOT_FOUND" ? "closed" : "needs-join");
      } finally {
        busyRef.current = false;
      }
    },
    [code],
  );

  const join = useCallback(
    async (nickname: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setError(null);
      try {
        const res = await joinRoom({ code, nickname });
        saveIdentity({ code, playerId: res.playerId, sessionToken: res.sessionToken });
        setPlayerId(res.playerId);
        setRoom(normalizeRoom(res.room));
        setPhase("joined");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "INTERNAL";
        setError(realtimeErrorMessage(msg));
        setPhase("needs-join");
      } finally {
        busyRef.current = false;
      }
    },
    [code],
  );

  const retry = useCallback(() => {
    setPhase("loading");
    getSocket().connect();
  }, []);

  const leave = useCallback(async () => {
    const socket = getSocket();
    try {
      await socket.emitWithAck("room:leave");
    } catch {
      // Best effort — we are leaving regardless.
    }
    clearIdentity(code);
    socket.disconnect();
    setSecret(null);
    setPhase("closed");
  }, [code]);

  const startRound = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await getSocket().emitWithAck("round:start");
      if (!res.ok) setError(realtimeErrorMessage(res.error));
      // On success the round arrives via `room:state` and, for the round's
      // master, the answer via `round:secret`.
    } catch {
      setError(realtimeErrorMessage("INTERNAL"));
    } finally {
      setBusy(false);
    }
  }, []);

  const beginRound = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await getSocket().emitWithAck("round:begin");
      if (!res.ok) setError(realtimeErrorMessage(res.error));
      // On success the ACTIVE round (with a deadline) arrives via `room:state`.
    } catch {
      setError(realtimeErrorMessage("INTERNAL"));
    } finally {
      setBusy(false);
    }
  }, []);

  const finishRound = useCallback(async (outcome: FinishOutcome, solvedById?: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await getSocket().emitWithAck("round:finish", { outcome, solvedById });
      if (!res.ok) setError(realtimeErrorMessage(res.error));
      // The reveal reaches everyone through the next `room:state`.
    } catch {
      setError(realtimeErrorMessage("INTERNAL"));
    } finally {
      setBusy(false);
    }
  }, []);

  const askQuestion = useCallback(async (content: string) => {
    setError(null);
    try {
      const res = await getSocket().emitWithAck("question:ask", { content });
      if (!res.ok) {
        setError(realtimeErrorMessage(res.error));
        return false;
      }
      // The question reaches everyone (incl. us) through `room:state`.
      return true;
    } catch {
      setError(realtimeErrorMessage("INTERNAL"));
      return false;
    }
  }, []);

  const passTurn = useCallback(async () => {
    setError(null);
    try {
      const res = await getSocket().emitWithAck("turn:pass");
      if (!res.ok) setError(realtimeErrorMessage(res.error));
    } catch {
      setError(realtimeErrorMessage("INTERNAL"));
    }
  }, []);

  const answerQuestion = useCallback(async (questionId: string, value: AnswerValue) => {
    setError(null);
    try {
      const res = await getSocket().emitWithAck("question:answer", { questionId, value });
      if (!res.ok) setError(realtimeErrorMessage(res.error));
    } catch {
      setError(realtimeErrorMessage("INTERNAL"));
    }
  }, []);

  const releaseHint = useCallback(async () => {
    setError(null);
    try {
      const res = await getSocket().emitWithAck("hint:release");
      if (!res.ok) setError(realtimeErrorMessage(res.error));
      // The released hint reaches everyone through the next `room:state`.
    } catch {
      setError(realtimeErrorMessage("INTERNAL"));
    }
  }, []);

  const submitGuess = useCallback(async (content: string) => {
    setError(null);
    try {
      const res = await getSocket().emitWithAck("guess:submit", { content });
      if (!res.ok) {
        setError(realtimeErrorMessage(res.error));
        return false;
      }
      return true;
    } catch {
      setError(realtimeErrorMessage("INTERNAL"));
      return false;
    }
  }, []);

  const resolveGuess = useCallback(async (guessId: string, accept: boolean) => {
    setError(null);
    try {
      const res = await getSocket().emitWithAck("guess:resolve", { guessId, accept });
      if (!res.ok) setError(realtimeErrorMessage(res.error));
    } catch {
      setError(realtimeErrorMessage("INTERNAL"));
    }
  }, []);

  const restartMatch = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await getSocket().emitWithAck("match:restart");
      if (!res.ok) setError(realtimeErrorMessage(res.error));
      else setSecret(null);
    } catch {
      setError(realtimeErrorMessage("INTERNAL"));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const onState = (s: RoomState) => {
      setRoom(normalizeRoom(s));
      // Track how far our clock is from the server's, so the countdown follows
      // the server's deadline rather than the device clock.
      setOffsetMs(new Date(s.serverTime).getTime() - Date.now());
      // Drop any answer we were holding once the round is over or gone (it is
      // now public via `round.reveal`). Keep it through WAITING + ACTIVE so the
      // master can read the story before pressing Iniciar.
      const live = s.round?.status === "WAITING" || s.round?.status === "ACTIVE";
      if (!live) setSecret(null);
    };
    // Only the round's master ever receives this event.
    const onSecret = (s: RoundSecret) => setSecret(s);
    const onClosed = () => {
      clearIdentity(code);
      setSecret(null);
      setPhase("closed");
    };
    const onConnect = () => {
      setConnection("connected");
      const identity = loadIdentity(code);
      if (identity?.sessionToken) void resume(identity.sessionToken);
      else setPhase((p) => (p === "joined" ? p : "needs-join"));
    };
    const onDisconnect = () => setConnection("reconnecting");
    // The server is down / unreachable. Socket.IO keeps retrying in the
    // background, but the player deserves to be told rather than stare at a
    // skeleton. A later successful `connect` flips us back automatically.
    const onConnectError = () => {
      setPhase((p) => (p === "joined" ? p : "unreachable"));
    };

    socket.on("room:state", onState);
    socket.on("round:secret", onSecret);
    socket.on("room:closed", onClosed);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    // Initial connection state is already "connecting" (see useState default).
    if (socket.connected) onConnect();
    else socket.connect();

    return () => {
      socket.off("room:state", onState);
      socket.off("round:secret", onSecret);
      socket.off("room:closed", onClosed);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
    };
  }, [code, resume]);

  const me = room && playerId ? (room.players.find((p) => p.id === playerId) ?? null) : null;
  const round = room?.round ?? null;
  const isMaster = Boolean(round && me && round.masterId === me.id);
  const isWaiting = round?.status === "WAITING";
  // ACTIVE but no live deadline + a frozen remaining => paused for a guess.
  const isPaused =
    round?.status === "ACTIVE" && !round.expiresAt && round.pausedRemainingMs != null;
  const isMyTurn = Boolean(round && me && round.currentAskerId === me.id);
  const amEliminated = Boolean(
    round && me && round.guesses.some((g) => g.playerId === me.id && g.status === "REJECTED"),
  );

  const value: RoomContextValue = {
    code,
    phase,
    connection,
    room,
    me,
    isHost: Boolean(me?.isHost),
    isMaster,
    isWaiting,
    isPaused: Boolean(isPaused),
    isMyTurn,
    amEliminated,
    secret,
    offsetMs,
    busy,
    error,
    join,
    retry,
    leave,
    startRound,
    beginRound,
    finishRound,
    restartMatch,
    askQuestion,
    passTurn,
    answerQuestion,
    releaseHint,
    submitGuess,
    resolveGuess,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
