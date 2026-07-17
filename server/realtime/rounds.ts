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
import { firstAsker, hintsAvailableFor } from "./round-utils";
import { awardSolve } from "./scores";

/** Enigma hints are stored JSON-encoded (SQLite has no array type). Never throws. */
function parseHints(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((h): h is string => typeof h === "string") : [];
  } catch {
    return [];
  }
}

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
  roomId: true,
  number: true,
  status: true,
  masterId: true,
  currentAskerId: true,
  solvedById: true,
  expiresAt: true,
  pausedRemainingMs: true,
  hintsReleased: true,
  // `enigma.hints` is loaded to compute counts/slices — NEVER spread whole into
  // the DTO (that would leak unreleased hints). Only the released slice ships.
  enigma: {
    select: { slug: true, title: true, teaser: true, difficulty: true, hints: true },
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

  // Hints: keep the full list server-side; ship only the released slice. The
  // "available" count drives the master's release button.
  const allHints = parseHints(round.enigma.hints);
  const released = allHints.slice(0, round.hintsReleased);
  const hintsAvailable = finished
    ? round.hintsReleased
    : await hintsAvailableFor(
        { id: round.id, roomId: round.roomId, masterId: round.masterId },
        allHints.length,
      );

  const { slug, title, teaser, difficulty } = round.enigma;

  return {
    id: round.id,
    number: round.number,
    status: asRoundStatus(round.status),
    masterId: round.masterId,
    currentAskerId: round.currentAskerId,
    solvedById: round.solvedById,
    expiresAt: finished ? null : (round.expiresAt?.toISOString() ?? null),
    // Frozen countdown while paused for a guess (ACTIVE + no live deadline).
    pausedRemainingMs: finished ? null : round.pausedRemainingMs,
    // Explicit fields only — never spread `round.enigma` (it carries `hints`).
    enigma: { slug, title, teaser, difficulty: asDifficulty(difficulty) },
    reveal: finished ? await buildReveal(round.id) : null,
    hints: released,
    hintsAvailable,
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
      enigma: { select: { solution: true, explanation: true, hints: true } },
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
    // The master previews the FULL list; detectives only see released ones.
    hints: parseHints(round.enigma.hints),
  };
}

/**
 * SECRET — the live round's secret for a room, if any. Includes WAITING so the
 * master can read the story before pressing Iniciar.
 */
export async function getActiveRoundSecret(roomId: string): Promise<RoundSecret | null> {
  const round = await prisma.round.findFirst({
    where: { roomId, status: { in: ["WAITING", "ACTIVE"] } },
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

/**
 * The master's id for the live round (WAITING or ACTIVE), if any. Used to
 * deliver the secret — the master needs it while WAITING to read the story.
 */
export async function getActiveMasterId(roomId: string): Promise<string | null> {
  const round = await prisma.round.findFirst({
    where: { roomId, status: { in: ["WAITING", "ACTIVE"] } },
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
 * Creates the next round in WAITING — host-only trigger. The MASTER rotates
 * automatically to the next player in join order, but the countdown does NOT
 * start yet: the master reads the story and then calls `beginRound` to start
 * the clock and the first turn.
 */
export async function startRound(roomId: string, requesterId: string): Promise<PublicRound> {
  await requireHost(roomId, requesterId);

  // A round already waiting OR running blocks a new one — otherwise a second
  // "Nova rodada" click before the master begins would spawn a duplicate.
  const inFlight = await prisma.round.findFirst({
    where: { roomId, status: { in: ["WAITING", "ACTIVE"] } },
    select: { id: true },
  });
  if (inFlight) throw new RoomError(RealtimeError.ROUND_IN_PROGRESS);

  const masterId = await pickNextMaster(roomId);
  const enigmaId = await pickRandomEnigmaId(roomId);
  const last = await prisma.round.findFirst({
    where: { roomId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const number = (last?.number ?? 0) + 1;

  // No startedAt/expiresAt/currentAskerId yet — beginRound fills those in.
  await prisma.round.create({
    data: { roomId, enigmaId, masterId, number, status: "WAITING" },
  });

  await prisma.room.update({
    where: { id: roomId },
    data: { status: "PLAYING", currentRoundNumber: number },
  });

  const round = await getPublicRound(roomId);
  if (!round) throw new RoomError(RealtimeError.INTERNAL);
  return round;
}

/**
 * The master starts the clock on the WAITING round they were handed: fixes the
 * server-authoritative deadline and gives the first turn to the first eligible
 * detective. Master-only.
 */
export async function beginRound(roomId: string, requesterId: string): Promise<StartedRound> {
  const waiting = await prisma.round.findFirst({
    where: { roomId, status: "WAITING" },
    orderBy: { number: "desc" },
    select: { id: true, roomId: true, masterId: true, currentAskerId: true },
  });
  if (!waiting) {
    // Nothing waiting: either a round is already running, or none exists.
    const active = await prisma.round.findFirst({
      where: { roomId, status: "ACTIVE" },
      select: { id: true },
    });
    throw new RoomError(active ? RealtimeError.ROUND_IN_PROGRESS : RealtimeError.NO_ACTIVE_ROUND);
  }
  if (waiting.masterId !== requesterId) throw new RoomError(RealtimeError.FORBIDDEN);

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + REALTIME_CONFIG.roundDurationMs);
  // First turn goes to the first eligible detective (nobody is eliminated yet).
  const asker = await firstAsker(waiting);

  await prisma.round.update({
    where: { id: waiting.id },
    data: { status: "ACTIVE", startedAt, expiresAt, currentAskerId: asker },
  });

  const round = await getPublicRound(roomId);
  if (!round) throw new RoomError(RealtimeError.INTERNAL);
  return { round, expiresAt };
}

/**
 * Master-only: reveals the next unlocked hint to the detectives. Recomputes the
 * unlock server-side, so a client cannot force a hint that isn't earned yet.
 */
export async function releaseHint(roomId: string, requesterId: string): Promise<void> {
  const round = await prisma.round.findFirst({
    where: { roomId, status: "ACTIVE" },
    orderBy: { number: "desc" },
    select: {
      id: true,
      roomId: true,
      masterId: true,
      hintsReleased: true,
      enigma: { select: { hints: true } },
    },
  });
  if (!round) throw new RoomError(RealtimeError.NO_ACTIVE_ROUND);
  if (round.masterId !== requesterId) throw new RoomError(RealtimeError.FORBIDDEN);

  const total = parseHints(round.enigma.hints).length;
  const available = await hintsAvailableFor(round, total);
  if (round.hintsReleased >= available) throw new RoomError(RealtimeError.NO_HINT_AVAILABLE);

  await prisma.round.update({
    where: { id: round.id },
    data: { hintsReleased: round.hintsReleased + 1 },
  });
}

/**
 * Freezes the ACTIVE round's clock for a pending guess: stores the time left
 * and clears the live deadline. Returns true only when it actually paused a
 * running round (idempotent — a second guess finds it already paused).
 */
export async function pauseRound(roomId: string): Promise<boolean> {
  const round = await prisma.round.findFirst({
    where: { roomId, status: "ACTIVE", expiresAt: { not: null } },
    orderBy: { number: "desc" },
    select: { id: true, expiresAt: true },
  });
  if (!round?.expiresAt) return false;
  const remaining = Math.max(0, round.expiresAt.getTime() - Date.now());
  await prisma.round.update({
    where: { id: round.id },
    data: { expiresAt: null, pausedRemainingMs: remaining },
  });
  return true;
}

/**
 * Restarts a paused round's clock from the frozen time left. Returns the new
 * deadline for the caller to schedule, or null if the round wasn't paused.
 */
export async function resumeRound(roomId: string): Promise<Date | null> {
  const round = await prisma.round.findFirst({
    where: { roomId, status: "ACTIVE", expiresAt: null, pausedRemainingMs: { not: null } },
    orderBy: { number: "desc" },
    select: { id: true, pausedRemainingMs: true },
  });
  if (round?.pausedRemainingMs == null) return null;
  const expiresAt = new Date(Date.now() + round.pausedRemainingMs);
  await prisma.round.update({
    where: { id: round.id },
    data: { expiresAt, pausedRemainingMs: null },
  });
  return expiresAt;
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
