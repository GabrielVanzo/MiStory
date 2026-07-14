"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import type { PlayerDTO, RoomState } from "@/lib/realtime/events";
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
  error: string | null;
  join: (nickname: string) => Promise<void>;
  leave: () => Promise<void>;
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
    setPhase("closed");
  }, [code]);

  useEffect(() => {
    const socket = getSocket();

    const onState = (s: RoomState) => setRoom(s);
    const onClosed = () => {
      clearIdentity(code);
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
    socket.on("room:closed", onClosed);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    // Initial connection state is already "connecting" (see useState default).
    if (socket.connected) onConnect();
    else socket.connect();

    return () => {
      socket.off("room:state", onState);
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
    error,
    join,
    leave,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
