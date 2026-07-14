import { randomUUID } from "node:crypto";

import { prisma } from "../../lib/prisma";
import type {
  CreateRoomInput,
  JoinRoomInput,
  PlayerDTO,
  RoomJoinedPayload,
  RoomState,
} from "../../lib/realtime/events";
import { RealtimeError, type RealtimeErrorCode } from "../../lib/realtime/events";

/** Domain error carrying a stable code the client can localize. */
export class RoomError extends Error {
  constructor(public code: RealtimeErrorCode) {
    super(code);
    this.name = "RoomError";
  }
}

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

function randomCodeSegment(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `${randomCodeSegment(4)}-${randomCodeSegment(4)}`;
    const existing = await prisma.room.findUnique({ where: { code }, select: { id: true } });
    if (!existing) return code;
  }
  throw new RoomError(RealtimeError.INTERNAL);
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

export async function buildRoomState(roomId: string): Promise<RoomState | null> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { players: { orderBy: { joinedAt: "asc" } } },
  });
  if (!room) return null;

  const host = room.players.find((p) => p.isHost);
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    status: room.status,
    isPrivate: room.isPrivate,
    maxPlayers: room.maxPlayers,
    hostId: host?.id ?? null,
    players: room.players.map(toPlayerDTO),
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

  const state = toState(room);
  return { room: state, playerId: room.players[0].id, sessionToken };
}

export async function joinOrResume(input: JoinRoomInput): Promise<RoomJoinedPayload> {
  const code = cleanText(input.code, 12).toUpperCase();
  const nickname = cleanText(input.nickname, NICKNAME_MAX);
  if (!code) throw new RoomError(RealtimeError.INVALID_INPUT);

  const room = await prisma.room.findUnique({
    where: { code },
    include: { players: { orderBy: { joinedAt: "asc" } } },
  });
  if (!room) throw new RoomError(RealtimeError.ROOM_NOT_FOUND);

  // Reconnection / revisit: reclaim an existing seat by its secret token.
  if (input.sessionToken) {
    const existing = room.players.find((p) => p.sessionToken === input.sessionToken);
    if (existing) {
      const updated = await prisma.player.update({
        where: { id: existing.id },
        data: { isConnected: true, lastSeenAt: new Date() },
      });
      const state = await buildRoomState(room.id);
      return { room: state!, playerId: updated.id, sessionToken: input.sessionToken };
    }
  }

  // Fresh join.
  if (!nickname) throw new RoomError(RealtimeError.INVALID_INPUT);
  if (room.players.length >= room.maxPlayers) throw new RoomError(RealtimeError.ROOM_FULL);
  if (room.players.some((p) => p.nickname.toLowerCase() === nickname.toLowerCase())) {
    throw new RoomError(RealtimeError.NICKNAME_TAKEN);
  }

  const sessionToken = randomUUID();
  const player = await prisma.player.create({
    data: {
      roomId: room.id,
      nickname,
      isHost: false,
      isConnected: true,
      sessionToken,
      color: PLAYER_COLORS[room.players.length % PLAYER_COLORS.length],
    },
  });

  const state = await buildRoomState(room.id);
  return { room: state!, playerId: player.id, sessionToken };
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
    await prisma.room.delete({ where: { id: roomId } });
    return null;
  }

  // Transfer host to the longest-present remaining player if the host left.
  if (player.isHost) {
    await prisma.player.update({ where: { id: remaining[0].id }, data: { isHost: true } });
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

type RoomWithPlayers = {
  id: string;
  code: string;
  name: string;
  status: string;
  isPrivate: boolean;
  maxPlayers: number;
  players: PlayerRow[];
};

function toState(room: RoomWithPlayers): RoomState {
  const ordered = [...room.players].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
  const host = ordered.find((p) => p.isHost);
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    status: room.status,
    isPrivate: room.isPrivate,
    maxPlayers: room.maxPlayers,
    hostId: host?.id ?? null,
    players: ordered.map(toPlayerDTO),
  };
}
