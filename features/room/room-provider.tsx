"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import type { PlayerDTO, RoomState, RoundSecret } from "@/lib/realtime/events";
import type { AnswerValue, FinishOutcome } from "@/types/game";
import { joinRoom, realtimeErrorMessage } from "@/lib/realtime/actions";
import { clearIdentity, loadIdentity, saveIdentity } from "@/lib/realtime/identity";
import { getSocket } from "@/lib/realtime/socket";

type Phase = "loading" | "needs-join" | "joined" | "closed";
type Connection = "connecting" | "connected" | "reconnecting";

interface RoomContextValue {
  code: string;
  phase: Phase;
  connection: Connection;
  room: RoomState | null;
  me: PlayerDTO | null;
  isHost: boolean;
  /**
   * The round's answer/explanation. Only ever populated for the host — the
   * server never sends `round:secret` to anyone else.
   */
  secret: RoundSecret | null;
  /** Server clock minus local clock (ms). Feeds the countdown. */
  offsetMs: number;
  /** True while a match action (start/finish/restart) is in flight. */
  busy: boolean;
  error: string | null;
  join: (nickname: string) => Promise<void>;
  leave: () => Promise<void>;
  startRound: () => Promise<void>;
  finishRound: (outcome: FinishOutcome, solvedById?: string) => Promise<void>;
  restartMatch: () => Promise<void>;
  /** Ask a question. Returns true on success so the input can clear itself. */
  askQuestion: (content: string) => Promise<boolean>;
  answerQuestion: (questionId: string, value: AnswerValue) => Promise<void>;
  /** Submit this player's single shot at the solution. */
  submitGuess: (content: string) => Promise<boolean>;
  /** Host-only: accept (ends the round) or reject (spends the shot). */
  resolveGuess: (guessId: string, accept: boolean) => Promise<void>;
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
        setRoom(res.room);
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
        setRoom(res.room);
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
      // On success the round arrives via `room:state` and, for the host, the
      // answer via `round:secret`.
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

  const answerQuestion = useCallback(async (questionId: string, value: AnswerValue) => {
    setError(null);
    try {
      const res = await getSocket().emitWithAck("question:answer", { questionId, value });
      if (!res.ok) setError(realtimeErrorMessage(res.error));
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
      setRoom(s);
      // Track how far our clock is from the server's, so the countdown follows
      // the server's deadline rather than the device clock.
      setOffsetMs(new Date(s.serverTime).getTime() - Date.now());
      // No active round -> drop any answer we were holding (it is either gone
      // or now public via `round.reveal`).
      if (s.round?.status !== "ACTIVE") setSecret(null);
    };
    // Only the host ever receives this event.
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

    socket.on("room:state", onState);
    socket.on("round:secret", onSecret);
    socket.on("room:closed", onClosed);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    // Initial connection state is already "connecting" (see useState default).
    if (socket.connected) onConnect();
    else socket.connect();

    return () => {
      socket.off("room:state", onState);
      socket.off("round:secret", onSecret);
      socket.off("room:closed", onClosed);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [code, resume]);

  const me = room && playerId ? (room.players.find((p) => p.id === playerId) ?? null) : null;

  const value: RoomContextValue = {
    code,
    phase,
    connection,
    room,
    me,
    isHost: Boolean(me?.isHost),
    secret,
    offsetMs,
    busy,
    error,
    join,
    leave,
    startRound,
    finishRound,
    restartMatch,
    askQuestion,
    answerQuestion,
    submitGuess,
    resolveGuess,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
