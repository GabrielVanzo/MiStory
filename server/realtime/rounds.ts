import { prisma } from "../../lib/prisma";
import type { FinishRoundInput, PublicRound, RoundSecret } from "../../lib/realtime/events";
import { RealtimeError } from "../../lib/realtime/events";
import { isFinishedRoundStatus } from "../../types/game";
import { asDifficulty, asRoundStatus } from "./db-enums";
import { RoomError } from "./errors";
import { asId } from "./input";
import { getGuesses } from "./guesses";
import { getQuestions } from "./questions";
import { awardSolve } from "./scores";
import { REALTIME_CONFIG } from "./config";

/**
 * PUBLIC round projection.
 *
 * SECURITY: this `select` deliberately omits `solution` and `explanation`. The
 * secrets are never loaded on the public path, so they cannot leak into a
 * broadcast by accident. They reach the wire only through `getRoundSecret`
 * (host-only, while the round runs) or `buildReveal` (after the round ends,
 * when the solution is intentionally made public).
 */
const PUBLIC_ROUND_SELECT = {
  id: true,
  number: true,
  status: true,
  masterId: true,
  solvedById: true,
  expiresAt: true,
  enigma: {
    select: { slug: true, title: true, teaser: true, difficulty: true },
  },
} as const;

/** Loads the solution for a finished round, to be shown to everyone. */
async function buildReveal(roundId: string) {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: { enigma: { select: { solution: true, explanation: true } } },
  });
  if (!round) return null;
  return { answer: round.enigma.solution, explanation: round.enigma.explanation };
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
    solvedById: round.solvedById,
    // A finished round has no deadline left to count down to.
    expiresAt: finished ? null : (round.expiresAt?.toISOString() ?? null),
    enigma: { ...round.enigma, difficulty: asDifficulty(round.enigma.difficulty) },
    reveal: finished ? await buildReveal(round.id) : null,
    questions: await getQuestions(round.id),
    guesses: await getGuesses(round.id),
  };
}

/** SECRET — resolve the answer/explanation for a round. Host delivery only. */
async function getRoundSecret(roundId: string): Promise<RoundSecret | null> {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: { id: true, enigma: { select: { solution: true, explanation: true } } },
  });
  if (!round) return null;
  return {
    roundId: round.id,
    answer: round.enigma.solution,
    explanation: round.enigma.explanation,
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

async function requireHost(roomId: string, requesterId: string): Promise<void> {
  const requester = await prisma.player.findUnique({
    where: { id: requesterId },
    select: { roomId: true, isHost: true },
  });
  if (!requester || requester.roomId !== roomId) throw new RoomError(RealtimeError.NOT_IN_ROOM);
  if (!requester.isHost) throw new RoomError(RealtimeError.FORBIDDEN);
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
 * Starts a round (the first one, or the next after the previous finished).
 * Host-only. The host becomes the round's master and the server — not the
 * client — fixes the deadline.
 */
export async function startRound(roomId: string, requesterId: string): Promise<StartedRound> {
  await requireHost(roomId, requesterId);

  const active = await prisma.round.findFirst({
    where: { roomId, status: "ACTIVE" },
    select: { id: true },
  });
  if (active) throw new RoomError(RealtimeError.ROUND_IN_PROGRESS);

  const enigmaId = await pickRandomEnigmaId(roomId);
  const last = await prisma.round.findFirst({
    where: { roomId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const number = (last?.number ?? 0) + 1;

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + REALTIME_CONFIG.roundDurationMs);

  await prisma.round.create({
    data: {
      roomId,
      enigmaId,
      masterId: requesterId,
      number,
      status: "ACTIVE",
      startedAt,
      expiresAt,
    },
    select: { id: true },
  });

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
 * Shared by the host action and the server-side timer. Returns null when there
 * is nothing active to end (already finished / raced).
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
    data: { status, endedAt: new Date(), solvedById: solvedById ?? null },
  });
  await prisma.room.update({ where: { id: roomId }, data: { status: "FINISHED" } });

  // Scoring happens here — the one place a round can transition to finished,
  // and only from ACTIVE, so the winner is awarded exactly once.
  if (status === "SOLVED" && solvedById) {
    await awardSolve(roomId, active.id, solvedById);
  }

  return getPublicRound(roomId);
}

/** Host-only manual finish. Reveals the solution to the whole room. */
export async function finishRound(
  roomId: string,
  requesterId: string,
  input: FinishRoundInput,
): Promise<PublicRound> {
  await requireHost(roomId, requesterId);

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
