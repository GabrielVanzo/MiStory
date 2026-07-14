import type { Server, Socket } from "socket.io";

import type {
  Ack,
  ClientToServerEvents,
  InterServerEvents,
  RoomJoinedPayload,
  ServerToClientEvents,
  SocketData,
} from "../../lib/realtime/events";
import { RealtimeError } from "../../lib/realtime/events";
import {
  buildRoomState,
  createRoom,
  joinOrResume,
  leaveRoom,
  RoomError,
  setConnected,
} from "./rooms";

export type RealtimeServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

type RealtimeSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

// Current live socket per player. Prevents presence "flapping" when a player
// reconnects on a fresh socket before the old socket's `disconnect` fires.
const playerSocket = new Map<string, string>();

function toErrorAck(error: unknown): Ack<never> {
  if (error instanceof RoomError) return { ok: false, error: error.code };
  console.error("[realtime] unexpected error:", error);
  return { ok: false, error: RealtimeError.INTERNAL };
}

async function broadcastState(io: RealtimeServer, roomId: string): Promise<void> {
  const state = await buildRoomState(roomId);
  if (state) io.to(roomId).emit("room:state", state);
}

async function attach(socket: RealtimeSocket, payload: RoomJoinedPayload): Promise<void> {
  socket.data = {
    playerId: payload.playerId,
    roomId: payload.room.id,
    code: payload.room.code,
  };
  playerSocket.set(payload.playerId, socket.id);
  await socket.join(payload.room.id);
}

export function registerRealtimeHandlers(io: RealtimeServer): void {
  io.on("connection", (socket: RealtimeSocket) => {
    socket.on("room:create", async (input, ack) => {
      try {
        const payload = await createRoom(input);
        await attach(socket, payload);
        ack({ ok: true, data: payload });
      } catch (error) {
        ack(toErrorAck(error));
      }
    });

    socket.on("room:join", async (input, ack) => {
      try {
        const payload = await joinOrResume(input);
        await attach(socket, payload);
        ack({ ok: true, data: payload });
        // Let everyone (incl. the joiner) converge on the authoritative state.
        await broadcastState(io, payload.room.id);
      } catch (error) {
        ack(toErrorAck(error));
      }
    });

    socket.on("room:leave", async (ack) => {
      const { playerId, roomId } = socket.data;
      if (!playerId || !roomId) {
        ack({ ok: false, error: RealtimeError.NOT_IN_ROOM });
        return;
      }
      try {
        playerSocket.delete(playerId);
        await socket.leave(roomId);
        socket.data = {};
        const state = await leaveRoom(playerId);
        if (state) io.to(roomId).emit("room:state", state);
        else io.to(roomId).emit("room:closed", "empty");
        ack({ ok: true, data: null });
      } catch (error) {
        ack(toErrorAck(error));
      }
    });

    socket.on("disconnect", async () => {
      const { playerId } = socket.data;
      if (!playerId) return;
      // Ignore if a newer socket already took over this player (reconnect).
      if (playerSocket.get(playerId) !== socket.id) return;
      playerSocket.delete(playerId);
      const roomId = await setConnected(playerId, false);
      if (roomId) await broadcastState(io, roomId);
    });
  });
}
