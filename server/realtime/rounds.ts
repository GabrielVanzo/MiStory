import { prisma } from "../../lib/prisma";
import type {
  FinishRoundInput,
  PublicRound,
  RoundReveal,
  RoundSecret,
} from "../../lib/realtime/events";
import { RealtimeError } from "../../lib/realtime/events";
import { isFinishedRoundStatus } from "../../types/game";
import { REALTIME_CONFIG } from "./config";
import { asDifficulty, asRoundStatus } from "./db-enums";
import { RoomError } from "./errors";
import { getGuesses } from "./guesses";
import { asId } from "./input";
import { getQuestions } from "./questions";
import { firstAsker } from "./round-utils";
import { awardSolve } from "./scores";

/**
 * PUBLIC round projection.
 *
 * SECURITY: this `select` never loads `solution`/`explanation` (the enigma
 * secret) nor guess `content` (the chute secret). Those reach the wire only
 * through `getRoundSecret` (master-only, while the round runs) or `buildReveal`
 * (after the round ends, when the solution is intentionally public).
 */
const PUBLIC_ROUND_SELECT = {
  id: true,
  number: true,
  status: true,
  masterId: true,
  currentAskerId: true,
  solvedById: true,
  expiresAt: true,
  enigma: {
    select: { slug: true, title: true, teaser: true, difficulty: true },
  },
} as const;

/** Loads the solution (and the winning guess) for a finished round. Public. */
async function buildReveal(roundId: string): Promise<RoundReveal | null> {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: {
      enigma: { select: { solution: true, explanation: true } },
      // Only the ACCEPTED guess is ever revealed — rejected ones stay secret.
      guesses: { where: { status: "ACCEPTED" }, select: { content: true }, take: 1 },
    },
  });
  if (!round) return null;
  return {
    answer: round.enigma.solution,
    explanation: round.enigma.explanation,
    winnerGuess: round.guesses[0]?.content ?? null,
  };
}

/**
 * The room's latest round, public fields only. Includes the solution ONLY once
 * the round is over (SOLVED / REVEALED / EXPIRED).
 */
export async function getPublicRound(roomId: string): Promise<PublicRound | null> {
  const round = await prisma.round.findFirst({
    where: { roomId },
    orderBy: { number: "desc" },
    select: PUBLIC_ROUND_SELECT,
  });
  if (!round) return null;

  const finished = isFinishedRoundStatus(round.status);

  return {
    id: round.id,
    number: round.number,
    status: asRoundStatus(round.status),
    masterId: round.masterId,
    currentAskerId: round.currentAskerId,
    solvedById: round.solvedById,
    expiresAt: finished ? null : (round.expiresAt?.toISOString() ?? null),
    enigma: { ...round.enigma, difficulty: asDifficulty(round.enigma.difficulty) },
    reveal: finished ? await buildReveal(round.id) : null,
    questions: await getQuestions(round.id),
    guesses: await getGuesses(round.id),
  };
}

/**
 * SECRET — the enigma solution PLUS the texts of guesses awaiting judgement.
 * Master delivery only.
 */
async function getRoundSecret(roundId: string): Promise<RoundSecret | null> {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: {
      id: true,
      enigma: { select: { solution: true, explanation: true } },
      guesses: {
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        select: { id: true, authorName: true, content: true },
      },
    },
  });
  if (!round) return null;
  return {
    roundId: round.id,
    answer: round.enigma.solution,
    explanation: round.enigma.explanation,
    pendingGuesses: round.guesses,
  };
}

/** SECRET — the ACTIVE round's secret for a room, if any. */
export async function getActiveRoundSecret(roomId: string): Promise<RoundSecret | null> {
  const round = await prisma.round.findFirst({
    where: { roomId, status: "ACTIVE" },
    orderBy: { number: "desc" },
    select: { id: true },
  });
  return round ? getRoundSecret(round.id) : null;
}

/** Host = room owner. Controls start/restart, but is a normal player otherwise. */
async function requireHost(roomId: string, requesterId: string): Promise<void> {
  const requester = await prisma.player.findUnique({
    where: { id: requesterId },
    select: { roomId: true, isHost: true },
  });
  if (!requester || requester.roomId !== roomId) throw new RoomError(RealtimeError.NOT_IN_ROOM);
  if (!requester.isHost) throw new RoomError(RealtimeError.FORBIDDEN);
}

/** Master = the narrator of the ACTIVE round (rotates each round). */
async function requireMaster(roomId: string, requesterId: string): Promise<string> {
  const round = await prisma.round.findFirst({
    where: { roomId, status: "ACTIVE" },
    orderBy: { number: "desc" },
    select: { id: true, masterId: true },
  });
  if (!round) throw new RoomError(RealtimeError.NO_ACTIVE_ROUND);
  if (round.masterId !== requesterId) throw new RoomError(RealtimeError.FORBIDDEN);
  return round.id;
}

/** The master's id for the ACTIVE round, if any (used to deliver the secret). */
export async function getActiveMasterId(roomId: string): Promise<string | null> {
  const round = await prisma.round.findFirst({
    where: { roomId, status: "ACTIVE" },
    orderBy: { number: "desc" },
    select: { masterId: true },
  });
  return round?.masterId ?? null;
}

/**
 * The next master, walking join order in a circle from the previous round's
 * master. Skips disconnected players. A round needs a master AND at least one
 * detective, so at least two players must be connected.
 */
async function pickNextMaster(roomId: string): Promise<string> {
  const players = await prisma.player.findMany({
    where: { roomId },
    orderBy: { joinedAt: "asc" },
    select: { id: true, isConnected: true },
  });
  const connectedCount = players.filter((p) => p.isConnected).length;
  if (connectedCount < 2) throw new RoomError(RealtimeError.NOT_ENOUGH_PLAYERS);

  const last = await prisma.round.findFirst({
    where: { roomId },
    orderBy: { number: "desc" },
    select: { masterId: true },
  });
  const startIndex = last?.masterId ? players.findIndex((p) => p.id === last.masterId) : -1;

  for (let step = 1; step <= players.length; step++) {
    const player = players[(startIndex + step + players.length) % players.length];
    if (player.isConnected) return player.id;
  }
  // Unreachable given connectedCount >= 2, but keeps the type honest.
  throw new RoomError(RealtimeError.NOT_ENOUGH_PLAYERS);
}

/** Picks a random published enigma, preferring ones not yet played in the room. */
async function pickRandomEnigmaId(roomId: string): Promise<string> {
  const played = await prisma.round.findMany({ where: { roomId }, select: { enigmaId: true } });
  const playedIds = played.map((r) => r.enigmaId);

  const fresh = await prisma.enigma.findMany({
    where: { isPublished: true, id: { notIn: playedIds } },
    select: { id: true },
  });

  // Fall back to the whole catalog once every enigma has been played.
  const pool = fresh.length
    ? fresh
    : await prisma.enigma.findMany({ where: { isPublished: true }, select: { id: true } });

  if (pool.length === 0) throw new RoomError(RealtimeError.NO_ENIGMAS);
  return pool[Math.floor(Math.random() * pool.length)].id;
}

export interface StartedRound {
  round: PublicRound;
  /** Absolute deadline the caller should schedule a timer for. */
  expiresAt: Date;
}

/**
 * Starts a round. Host-only trigger, but the MASTER rotates automatically to
 * the next player in join order. The server — not the client — fixes both the
 * deadline and the first detective's turn.
 */
export async function startRound(roomId: string, requesterId: string): Promise<StartedRound> {
  await requireHost(roomId, requesterId);

  const active = await prisma.round.findFirst({
    where: { roomId, status: "ACTIVE" },
    select: { id: true },
  });
  if (active) throw new RoomError(RealtimeError.ROUND_IN_PROGRESS);

  const masterId = await pickNextMaster(roomId);
  const enigmaId = await pickRandomEnigmaId(roomId);
  const last = await prisma.round.findFirst({
    where: { roomId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const number = (last?.number ?? 0) + 1;

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + REALTIME_CONFIG.roundDurationMs);

  const created = await prisma.round.create({
    data: { roomId, enigmaId, masterId, number, status: "ACTIVE", startedAt, expiresAt },
    select: { id: true, roomId: true, masterId: true, currentAskerId: true },
  });

  // First turn goes to the first eligible detective (nobody is eliminated yet).
  const asker = await firstAsker(created);
  await prisma.round.update({ where: { id: created.id }, data: { currentAskerId: asker } });

  await prisma.room.update({
    where: { id: roomId },
    data: { status: "PLAYING", currentRoundNumber: number },
  });

  const round = await getPublicRound(roomId);
  if (!round) throw new RoomError(RealtimeError.INTERNAL);
  return { round, expiresAt };
}

/**
 * Ends the ACTIVE round with the given status and moves the room to FINISHED.
 * Shared by the master action and the server-side timer. Returns null when
 * there is nothing active to end (already finished / raced).
 */
async function endActiveRound(
  roomId: string,
  status: "SOLVED" | "REVEALED" | "EXPIRED",
  solvedById?: string | null,
): Promise<PublicRound | null> {
  const active = await prisma.round.findFirst({
    where: { roomId, status: "ACTIVE" },
    orderBy: { number: "desc" },
    select: { id: true },
  });
  if (!active) return null;

  await prisma.round.update({
    where: { id: active.id },
    data: { status, endedAt: new Date(), solvedById: solvedById ?? null, currentAskerId: null },
  });
  await prisma.room.update({ where: { id: roomId }, data: { status: "FINISHED" } });

  // Scoring happens here — the one place a round transitions to finished, and
  // only from ACTIVE, so the winner is awarded exactly once.
  if (status === "SOLVED" && solvedById) {
    await awardSolve(roomId, active.id, solvedById);
  }

  return getPublicRound(roomId);
}

/** Master-only manual finish. Reveals the solution to the whole room. */
export async function finishRound(
  roomId: string,
  requesterId: string,
  input: FinishRoundInput,
): Promise<PublicRound> {
  await requireMaster(roomId, requesterId);

  const outcome = input?.outcome === "SOLVED" ? "SOLVED" : "REVEALED";

  let solvedById: string | null = null;
  if (outcome === "SOLVED" && input.solvedById) {
    const solver = await prisma.player.findUnique({
      where: { id: asId(input.solvedById) },
      select: { id: true, roomId: true },
    });
    if (!solver || solver.roomId !== roomId) throw new RoomError(RealtimeError.INVALID_INPUT);
    solvedById = solver.id;
  }

  const round = await endActiveRound(roomId, outcome, solvedById);
  if (!round) throw new RoomError(RealtimeError.NO_ACTIVE_ROUND);
  return round;
}

/** Server-side expiry, triggered by the round timer or the sweeper. */
export async function expireRound(roomId: string): Promise<PublicRound | null> {
  return endActiveRound(roomId, "EXPIRED");
}

/** ACTIVE rounds whose deadline already passed (safety net after a restart). */
export async function findOverdueRounds(now: Date = new Date()) {
  return prisma.round.findMany({
    where: { status: "ACTIVE", expiresAt: { lte: now } },
    select: { id: true, roomId: true },
  });
}

/** ACTIVE rounds still counting down — used to re-arm timers on boot. */
export async function findPendingRounds(now: Date = new Date()) {
  return prisma.round.findMany({
    where: { status: "ACTIVE", expiresAt: { gt: now } },
    select: { id: true, roomId: true, expiresAt: true },
  });
}

/**
 * Host-only. Wipes round history and returns the room to the lobby, so the
 * enigma pool starts fresh.
 */
export async function restartMatch(roomId: string, requesterId: string): Promise<void> {
  await requireHost(roomId, requesterId);
  await prisma.round.deleteMany({ where: { roomId } });
  await prisma.room.update({
    where: { id: roomId },
    data: { status: "LOBBY", currentRoundNumber: null },
  });
}
