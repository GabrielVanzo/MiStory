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
import { REALTIME_CONFIG } from "./config";
import { RoomError } from "./errors";
import { allow, forgetSocket } from "./rate-limit";
import {
  buildRoomState,
  createRoom,
  findHostId,
  joinOrResume,
  leaveRoom,
  setConnected,
  sweepRooms,
} from "./rooms";
import { resolveGuess, submitGuess } from "./guesses";
import { answerQuestion, askQuestion } from "./questions";
import {
  expireRound,
  findOverdueRounds,
  findPendingRounds,
  finishRound,
  getActiveRoundSecret,
  restartMatch,
  startRound,
} from "./rounds";

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

/**
 * Delivers the active round's answer to the room's host — and nobody else.
 *
 * SECURITY: this targets the host's own socket id (never a room), and is the
 * only path that ever puts the answer on the wire. Called on round start, when
 * the host (re)joins, and after a host transfer so the new host can narrate.
 */
async function sendSecretToHost(io: RealtimeServer, roomId: string): Promise<void> {
  // PERF: this used to call buildRoomState — the full snapshot (players, round,
  // questions, guesses, leaderboard, history) just to read two fields. Now it
  // asks only for the host id, which is all the decision needs.
  const hostId = await findHostId(roomId);
  if (!hostId) return;

  const socketId = playerSocket.get(hostId);
  if (!socketId) return; // host is offline — nothing to deliver

  // Returns null unless a round is ACTIVE: once it ends the solution becomes
  // public through `reveal`, so there is nothing private left to deliver.
  const secret = await getActiveRoundSecret(roomId);
  if (secret) io.to(socketId).emit("round:secret", secret);
}

// Live expiry timers, keyed by roomId. The SERVER owns the clock: clients only
// render a countdown towards the deadline it publishes.
const roundTimers = new Map<string, NodeJS.Timeout>();

function cancelRoundTimer(roomId: string): void {
  const timer = roundTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    roundTimers.delete(roomId);
  }
}

/** Fires exactly once at the deadline, ending the round server-side. */
function scheduleRoundExpiry(io: RealtimeServer, roomId: string, expiresAt: Date): void {
  cancelRoundTimer(roomId);
  const delay = Math.max(0, expiresAt.getTime() - Date.now());

  const timer = setTimeout(() => {
    roundTimers.delete(roomId);
    void (async () => {
      try {
        const round = await expireRound(roomId);
        if (round) await broadcastState(io, roomId);
      } catch (error) {
        console.error("[realtime] round expiry failed:", error);
      }
    })();
  }, delay);

  timer.unref();
  roundTimers.set(roomId, timer);
}

/**
 * Re-arms timers after a restart and immediately closes any round whose
 * deadline passed while the process was down.
 */
export async function resumeRoundTimers(io: RealtimeServer): Promise<void> {
  const overdue = await findOverdueRounds();
  for (const round of overdue) {
    await expireRound(round.roomId);
    await broadcastState(io, round.roomId);
  }

  const pending = await findPendingRounds();
  for (const round of pending) {
    if (round.expiresAt) scheduleRoundExpiry(io, round.roomId, round.expiresAt);
  }

  if (overdue.length || pending.length) {
    console.log(
      `[realtime] rounds: expired ${overdue.length} overdue, re-armed ${pending.length} timer(s)`,
    );
  }
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
    // Budget every inbound event in one place, before any handler runs. The UI
    // disabling a button is cosmetic; this is the actual limit.
    socket.use(([event, ...args], next) => {
      if (allow(socket.id, String(event))) return next();

      // Reply through the ack (last arg) when there is one, so the client shows
      // a proper message instead of hanging.
      const ack = args[args.length - 1];
      if (typeof ack === "function") {
        (ack as (res: Ack<never>) => void)({ ok: false, error: RealtimeError.RATE_LIMITED });
      }
      // Swallow the event: do not pass it to the handler.
    });

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
        // PERF: joinOrResume already built this exact snapshot and nothing has
        // changed since, so broadcast it instead of rebuilding it.
        io.to(payload.room.id).emit("room:state", payload.room);
        // A host rejoining (reload/reconnect) must get the answer back.
        // Non-hosts never reach this branch.
        const isHost = payload.room.players.some((p) => p.id === payload.playerId && p.isHost);
        if (isHost) await sendSecretToHost(io, payload.room.id);
      } catch (error) {
        ack(toErrorAck(error));
      }
    });

    socket.on("round:start", async (ack) => {
      const { playerId, roomId } = socket.data;
      if (!playerId || !roomId) {
        ack({ ok: false, error: RealtimeError.NOT_IN_ROOM });
        return;
      }
      try {
        // startRound enforces host-only; a non-host gets FORBIDDEN and no data.
        const { round, expiresAt } = await startRound(roomId, playerId);
        // The server owns the deadline from this moment on.
        scheduleRoundExpiry(io, roomId, expiresAt);
        ack({ ok: true, data: round });
        await broadcastState(io, roomId);
        await sendSecretToHost(io, roomId);
      } catch (error) {
        ack(toErrorAck(error));
      }
    });

    socket.on("round:finish", async (input, ack) => {
      const { playerId, roomId } = socket.data;
      if (!playerId || !roomId) {
        ack({ ok: false, error: RealtimeError.NOT_IN_ROOM });
        return;
      }
      try {
        // Host-only. Ending the round makes the solution public to everyone.
        const round = await finishRound(roomId, playerId, input);
        cancelRoundTimer(roomId);
        ack({ ok: true, data: round });
        await broadcastState(io, roomId);
      } catch (error) {
        ack(toErrorAck(error));
      }
    });

    socket.on("question:ask", async (input, ack) => {
      const { playerId, roomId } = socket.data;
      if (!playerId || !roomId) {
        ack({ ok: false, error: RealtimeError.NOT_IN_ROOM });
        return;
      }
      try {
        const question = await askQuestion(roomId, playerId, input);
        ack({ ok: true, data: question });
        // Everyone sees the new question immediately.
        await broadcastState(io, roomId);
      } catch (error) {
        ack(toErrorAck(error));
      }
    });

    socket.on("question:answer", async (input, ack) => {
      const { playerId, roomId } = socket.data;
      if (!playerId || !roomId) {
        ack({ ok: false, error: RealtimeError.NOT_IN_ROOM });
        return;
      }
      try {
        // Host-only, and only YES | NO | IRRELEVANT are accepted.
        const question = await answerQuestion(roomId, playerId, input);
        ack({ ok: true, data: question });
        await broadcastState(io, roomId);
      } catch (error) {
        ack(toErrorAck(error));
      }
    });

    socket.on("guess:submit", async (input, ack) => {
      const { playerId, roomId } = socket.data;
      if (!playerId || !roomId) {
        ack({ ok: false, error: RealtimeError.NOT_IN_ROOM });
        return;
      }
      try {
        // One shot per player per round — enforced by a unique index.
        const guess = await submitGuess(roomId, playerId, input);
        ack({ ok: true, data: guess });
        await broadcastState(io, roomId);
      } catch (error) {
        ack(toErrorAck(error));
      }
    });

    socket.on("guess:resolve", async (input, ack) => {
      const { playerId, roomId } = socket.data;
      if (!playerId || !roomId) {
        ack({ ok: false, error: RealtimeError.NOT_IN_ROOM });
        return;
      }
      try {
        // Host-only judgement.
        const { guess, winnerId } = await resolveGuess(roomId, playerId, input);

        if (winnerId) {
          // Accepted: the round ends right here and the guesser wins.
          await finishRound(roomId, playerId, { outcome: "SOLVED", solvedById: winnerId });
          cancelRoundTimer(roomId);
        }
        // Rejected: the shot stays spent; the unique index blocks a retry.

        ack({ ok: true, data: guess });
        await broadcastState(io, roomId);
      } catch (error) {
        ack(toErrorAck(error));
      }
    });

    socket.on("match:restart", async (ack) => {
      const { playerId, roomId } = socket.data;
      if (!playerId || !roomId) {
        ack({ ok: false, error: RealtimeError.NOT_IN_ROOM });
        return;
      }
      try {
        await restartMatch(roomId, playerId);
        cancelRoundTimer(roomId);
        ack({ ok: true, data: null });
        await broadcastState(io, roomId);
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
        if (state) {
          io.to(roomId).emit("room:state", state);
          // The host may have changed — the new host needs the answer to narrate.
          await sendSecretToHost(io, roomId);
        } else {
          io.to(roomId).emit("room:closed", "empty");
        }
        ack({ ok: true, data: null });
      } catch (error) {
        ack(toErrorAck(error));
      }
    });

    socket.on("disconnect", async () => {
      forgetSocket(socket.id);
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

/**
 * Periodic reconciliation loop. The socket handlers cover players who leave
 * explicitly; this covers everyone who just vanishes (closed tab, dead network,
 * server restart): abandoned rooms are deleted, stale seats freed and an
 * absent host is replaced.
 */
export function startSweeper(io: RealtimeServer): NodeJS.Timeout {
  const tick = async () => {
    try {
      // Safety net: close rounds whose deadline passed but whose timer was lost
      // (e.g. the process restarted between arming and firing).
      for (const round of await findOverdueRounds()) {
        cancelRoundTimer(round.roomId);
        if (await expireRound(round.roomId)) await broadcastState(io, round.roomId);
      }

      const { deletedRoomIds, updatedRoomIds } = await sweepRooms();
      for (const roomId of deletedRoomIds) {
        cancelRoundTimer(roomId);
        io.to(roomId).emit("room:closed", "abandoned");
      }
      for (const roomId of updatedRoomIds) {
        await broadcastState(io, roomId);
        // A sweep may have transferred host; hand the answer to whoever holds it now.
        await sendSecretToHost(io, roomId);
      }
    } catch (error) {
      console.error("[realtime] sweep failed:", error);
    }
  };

  const timer = setInterval(tick, REALTIME_CONFIG.sweepIntervalMs);
  timer.unref();
  return timer;
}
