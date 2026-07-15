import { randomUUID } from "node:crypto";

import { prisma } from "../../lib/prisma";
import type {
  CreateRoomInput,
  JoinRoomInput,
  PlayerDTO,
  RoomJoinedPayload,
  RoomState,
} from "../../lib/realtime/events";
import { RealtimeError } from "../../lib/realtime/events";
import { REALTIME_CONFIG } from "./config";
import { RoomError } from "./errors";
import { getPublicRound } from "./rounds";
import { getHistory, getLeaderboard } from "./scores";

const NICKNAME_MAX = 20;
const NAME_MAX = 40;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;

/** Distinct avatar accent colors, assigned round-robin by join order. */
const PLAYER_COLORS = [
  "#8b5cf6",
  "#22d3ee",
  "#f59e0b",
  "#ef4444",
  "#10b981",
  "#ec4899",
  "#3b82f6",
  "#eab308",
];

// Unambiguous alphabet (no O/0, I/1) for readable join codes.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_SEGMENT = 4;

function randomCodeSegment(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `${randomCodeSegment(CODE_SEGMENT)}-${randomCodeSegment(CODE_SEGMENT)}`;
    const existing = await prisma.room.findUnique({ where: { code }, select: { id: true } });
    if (!existing) return code;
  }
  throw new RoomError(RealtimeError.INTERNAL);
}

/**
 * Accepts what users actually type — "lago7x2k", "LAGO 7X2K", "lago-7x2k" —
 * and returns the canonical "LAGO-7X2K". Returns null when it cannot be a code.
 */
export function normalizeCode(raw: string): string | null {
  const cleaned = String(raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (cleaned.length !== CODE_SEGMENT * 2) return null;
  return `${cleaned.slice(0, CODE_SEGMENT)}-${cleaned.slice(CODE_SEGMENT)}`;
}

/** Prisma unique-constraint violation, detected without importing error classes. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

type PlayerRow = {
  id: string;
  nickname: string;
  color: string | null;
  isHost: boolean;
  isConnected: boolean;
  joinedAt: Date;
};

function toPlayerDTO(player: PlayerRow): PlayerDTO {
  return {
    id: player.id,
    nickname: player.nickname,
    color: player.color,
    isHost: player.isHost,
    isConnected: player.isConnected,
    joinedAt: player.joinedAt.toISOString(),
  };
}

/**
 * The authoritative snapshot broadcast to every player in a room.
 *
 * SECURITY: everything here is public. The round is fetched through
 * `getPublicRound`, which never loads the enigma's answer/explanation.
 */
export async function buildRoomState(roomId: string): Promise<RoomState | null> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { players: { orderBy: { joinedAt: "asc" } } },
  });
  if (!room) return null;

  const host = room.players.find((p) => p.isHost);
  const [round, leaderboard, history] = await Promise.all([
    getPublicRound(roomId),
    getLeaderboard(roomId),
    getHistory(roomId),
  ]);

  return {
    id: room.id,
    code: room.code,
    name: room.name,
    status: room.status,
    isPrivate: room.isPrivate,
    maxPlayers: room.maxPlayers,
    hostId: host?.id ?? null,
    players: room.players.map(toPlayerDTO),
    round,
    leaderboard,
    history,
    serverTime: new Date().toISOString(),
  };
}

export async function createRoom(input: CreateRoomInput): Promise<RoomJoinedPayload> {
  const name = cleanText(input.name, NAME_MAX);
  const nickname = cleanText(input.nickname, NICKNAME_MAX);
  if (!name || !nickname) throw new RoomError(RealtimeError.INVALID_INPUT);

  const maxPlayers = Math.min(
    MAX_PLAYERS,
    Math.max(MIN_PLAYERS, Math.trunc(input.maxPlayers ?? MAX_PLAYERS)),
  );

  const code = await generateUniqueCode();
  const sessionToken = randomUUID();

  const room = await prisma.room.create({
    data: {
      code,
      name,
      status: "LOBBY",
      isPrivate: input.isPrivate ?? true,
      maxPlayers,
      players: {
        create: {
          nickname,
          isHost: true,
          isConnected: true,
          sessionToken,
          color: PLAYER_COLORS[0],
        },
      },
    },
    include: { players: true },
  });

  const state = await buildRoomState(room.id);
  if (!state) throw new RoomError(RealtimeError.INTERNAL);
  return { room: state, playerId: room.players[0].id, sessionToken };
}

export async function joinOrResume(input: JoinRoomInput): Promise<RoomJoinedPayload> {
  if (!cleanText(input.code, 32)) throw new RoomError(RealtimeError.INVALID_INPUT);
  const code = normalizeCode(input.code);
  if (!code) throw new RoomError(RealtimeError.ROOM_NOT_FOUND);

  // Reconnection / revisit: reclaim an existing seat by its secret token.
  if (input.sessionToken) {
    const existing = await prisma.player.findFirst({
      where: { sessionToken: input.sessionToken, room: { code } },
      select: { id: true, roomId: true },
    });
    if (existing) {
      await prisma.player.update({
        where: { id: existing.id },
        data: { isConnected: true, lastSeenAt: new Date() },
      });
      const state = await buildRoomState(existing.roomId);
      if (!state) throw new RoomError(RealtimeError.ROOM_NOT_FOUND);
      return { room: state, playerId: existing.id, sessionToken: input.sessionToken };
    }
  }

  const nickname = cleanText(input.nickname, NICKNAME_MAX);
  if (!nickname) throw new RoomError(RealtimeError.INVALID_INPUT);
  const sessionToken = randomUUID();

  // Fresh join runs in a transaction so two concurrent joins cannot exceed
  // maxPlayers or land the same nickname.
  const created = await prisma
    .$transaction(async (tx) => {
      const room = await tx.room.findUnique({
        where: { code },
        select: {
          id: true,
          maxPlayers: true,
          players: { select: { id: true, nickname: true } },
        },
      });
      if (!room) throw new RoomError(RealtimeError.ROOM_NOT_FOUND);
      if (room.players.length >= room.maxPlayers) throw new RoomError(RealtimeError.ROOM_FULL);
      if (room.players.some((p) => p.nickname.toLowerCase() === nickname.toLowerCase())) {
        throw new RoomError(RealtimeError.NICKNAME_TAKEN);
      }

      return tx.player.create({
        data: {
          roomId: room.id,
          nickname,
          isHost: false,
          isConnected: true,
          sessionToken,
          color: PLAYER_COLORS[room.players.length % PLAYER_COLORS.length],
        },
        select: { id: true, roomId: true },
      });
    })
    .catch((error: unknown) => {
      if (error instanceof RoomError) throw error;
      if (isUniqueViolation(error)) throw new RoomError(RealtimeError.NICKNAME_TAKEN);
      throw error;
    });

  const state = await buildRoomState(created.roomId);
  if (!state) throw new RoomError(RealtimeError.ROOM_NOT_FOUND);
  return { room: state, playerId: created.id, sessionToken };
}

/**
 * Remove a player. Reassigns host if needed and deletes the room when empty.
 * Returns the updated state, or null if the room no longer exists.
 */
export async function leaveRoom(playerId: string): Promise<RoomState | null> {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return null;
  const roomId = player.roomId;

  await prisma.player.delete({ where: { id: playerId } });

  const remaining = await prisma.player.findMany({
    where: { roomId },
    orderBy: { joinedAt: "asc" },
  });

  if (remaining.length === 0) {
    await prisma.room.delete({ where: { id: roomId } }).catch(() => null);
    return null;
  }

  // Transfer host to the longest-present remaining player if the host left.
  if (player.isHost) {
    const next = remaining.find((p) => p.isConnected) ?? remaining[0];
    await prisma.player.update({ where: { id: next.id }, data: { isHost: true } });
  }

  return buildRoomState(roomId);
}

/** Update presence; returns the player's roomId (or null if unknown). */
export async function setConnected(playerId: string, isConnected: boolean): Promise<string | null> {
  const player = await prisma.player
    .update({
      where: { id: playerId },
      data: { isConnected, lastSeenAt: new Date() },
      select: { roomId: true },
    })
    .catch(() => null);
  return player?.roomId ?? null;
}

/**
 * No sockets exist right after boot, so any `isConnected` left over from a
 * previous process is a lie. Reset it and give everyone a fresh grace window.
 */
export async function markAllPlayersDisconnected(): Promise<number> {
  const res = await prisma.player.updateMany({
    data: { isConnected: false, lastSeenAt: new Date() },
  });
  return res.count;
}

export interface SweepResult {
  deletedRoomIds: string[];
  updatedRoomIds: string[];
}

/**
 * Periodic reconciliation — the safety net behind the immediate socket
 * handlers. Handles the cases that no `room:leave` ever covers:
 *   1. rooms whose players all vanished  -> delete the room
 *   2. seats held by long-gone players   -> free the seat
 *   3. a host who left and never returned -> transfer host
 */
export async function sweepRooms(now: number = Date.now()): Promise<SweepResult> {
  const deletedRoomIds: string[] = [];
  const updatedRoomIds: string[] = [];

  const rooms = await prisma.room.findMany({
    include: { players: { orderBy: { joinedAt: "asc" } } },
  });

  const activityOf = (p: { lastSeenAt: Date | null; joinedAt: Date }) =>
    (p.lastSeenAt ?? p.joinedAt).getTime();

  for (const room of rooms) {
    const connected = room.players.filter((p) => p.isConnected);

    // 1. Nobody is connected — delete once the grace window has passed.
    if (connected.length === 0) {
      const lastActivity = room.players.length
        ? Math.max(...room.players.map(activityOf))
        : room.createdAt.getTime();
      if (now - lastActivity > REALTIME_CONFIG.roomTtlMs) {
        await prisma.room.delete({ where: { id: room.id } }).catch(() => null);
        deletedRoomIds.push(room.id);
      }
      continue;
    }

    let changed = false;

    // 2. Free seats held by players who have been offline too long.
    //    ONLY in the lobby: freeing a seat means DELETING the player, which
    //    would also destroy their identity, score and place in the standings.
    //    Mid-match a dropped connection must never cost someone their game —
    //    they keep their seat and can resume. Seats only matter before kickoff.
    const inLobby = room.status === "LOBBY";
    const ghosts = inLobby
      ? room.players.filter(
          (p) => !p.isConnected && now - activityOf(p) > REALTIME_CONFIG.playerTtlMs,
        )
      : [];
    if (ghosts.length > 0) {
      await prisma.player.deleteMany({ where: { id: { in: ghosts.map((g) => g.id) } } });
      changed = true;
    }

    // 3. Transfer host if it is missing or has been offline past the grace.
    const remaining = room.players.filter((p) => !ghosts.some((g) => g.id === p.id));
    const host = remaining.find((p) => p.isHost);
    const hostIsStale = host
      ? !host.isConnected && now - activityOf(host) > REALTIME_CONFIG.hostGraceMs
      : true;

    if (hostIsStale) {
      const candidate = remaining.find((p) => p.isConnected);
      if (candidate && candidate.id !== host?.id) {
        if (host) {
          await prisma.player.update({ where: { id: host.id }, data: { isHost: false } });
        }
        await prisma.player.update({ where: { id: candidate.id }, data: { isHost: true } });
        changed = true;
      }
    }

    if (changed) updatedRoomIds.push(room.id);
  }

  return { deletedRoomIds, updatedRoomIds };
}
