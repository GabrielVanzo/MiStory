import { prisma } from "../../lib/prisma";
import { RealtimeError } from "../../lib/realtime/events";
import { RoomError } from "./errors";

export interface ActiveRound {
  id: string;
  roomId: string;
  masterId: string | null;
  currentAskerId: string | null;
}

/**
 * The room's ACTIVE round, or `NO_ACTIVE_ROUND`.
 * Shared by questions / guesses / turns so none of them import the round
 * lifecycle module.
 */
export async function requireActiveRound(roomId: string): Promise<ActiveRound> {
  const round = await prisma.round.findFirst({
    where: { roomId, status: "ACTIVE" },
    orderBy: { number: "desc" },
    select: { id: true, roomId: true, masterId: true, currentAskerId: true },
  });
  if (!round) throw new RoomError(RealtimeError.NO_ACTIVE_ROUND);
  return round;
}

/** The room's ACTIVE round, or null. The non-throwing sibling of requireActiveRound. */
export async function getActiveRound(roomId: string): Promise<ActiveRound | null> {
  return prisma.round.findFirst({
    where: { roomId, status: "ACTIVE" },
    orderBy: { number: "desc" },
    select: { id: true, roomId: true, masterId: true, currentAskerId: true },
  });
}

/** Players who are OUT of a round: their guess was rejected. */
export async function getEliminatedIds(roundId: string): Promise<Set<string>> {
  const rejected = await prisma.guess.findMany({
    where: { roundId, status: "REJECTED", playerId: { not: null } },
    select: { playerId: true },
  });
  return new Set(rejected.map((g) => g.playerId as string));
}

/** Is there a question still waiting for the master? Only one at a time. */
export async function hasPendingQuestion(roundId: string): Promise<boolean> {
  const pending = await prisma.question.findFirst({
    where: { roundId, answer: null },
    select: { id: true },
  });
  return pending !== null;
}

/** Is there a guess still awaiting the master's verdict? Pauses the clock. */
export async function hasPendingGuesses(roundId: string): Promise<boolean> {
  const pending = await prisma.guess.findFirst({
    where: { roundId, status: "PENDING" },
    select: { id: true },
  });
  return pending !== null;
}

const HINT_STEP_MAX = 16;

/**
 * How many negative answers unlock ONE more hint: 4 per detective, capped at 16.
 * So 2 detectives => every 8, 4+ detectives => every 16.
 */
export function hintStep(detectiveCount: number): number {
  return Math.min(Math.max(detectiveCount, 1) * 4, HINT_STEP_MAX);
}

/** Questions answered "Não" or "Irrelevante" — the ones that count toward hints. */
export async function countNegativeAnswers(roundId: string): Promise<number> {
  return prisma.question.count({
    where: { roundId, answer: { value: { in: ["NO", "IRRELEVANT"] } } },
  });
}

/** Detectives in the room = everyone who is not this round's master. */
export async function countDetectives(roomId: string, masterId: string | null): Promise<number> {
  return prisma.player.count({
    where: masterId ? { roomId, NOT: { id: masterId } } : { roomId },
  });
}

/**
 * How many hints could be released right now — tiers unlocked by negative
 * answers (each worth `hintStep`), capped by how many the enigma actually has.
 */
export async function hintsAvailableFor(
  round: { id: string; roomId: string; masterId: string | null },
  totalHints: number,
): Promise<number> {
  if (totalHints <= 0) return 0;
  const [negatives, detectives] = await Promise.all([
    countNegativeAnswers(round.id),
    countDetectives(round.roomId, round.masterId),
  ]);
  const unlockedTiers = Math.floor(negatives / hintStep(detectives));
  return Math.min(unlockedTiers, totalHints);
}

type SeatRow = { id: string; isConnected: boolean };

/** Room players in join order — the fixed seating the turn queue walks around. */
async function seatsInOrder(roomId: string): Promise<SeatRow[]> {
  return prisma.player.findMany({
    where: { roomId },
    orderBy: { joinedAt: "asc" },
    select: { id: true, isConnected: true },
  });
}

function isEligible(seat: SeatRow, masterId: string | null, eliminated: Set<string>): boolean {
  return seat.isConnected && seat.id !== masterId && !eliminated.has(seat.id);
}

/**
 * The next detective who may ask, walking join order in a circle starting AFTER
 * `afterPlayerId` (or from the top when null). Skips the master, the eliminated
 * and the disconnected. Returns null when nobody is eligible.
 */
export async function computeNextAsker(
  round: ActiveRound,
  afterPlayerId: string | null,
): Promise<string | null> {
  const seats = await seatsInOrder(round.roomId);
  if (seats.length === 0) return null;
  const eliminated = await getEliminatedIds(round.id);

  const startIndex = afterPlayerId ? seats.findIndex((s) => s.id === afterPlayerId) : -1;

  // Walk the whole ring once, beginning just after the start index.
  for (let step = 1; step <= seats.length; step++) {
    const seat = seats[(startIndex + step + seats.length) % seats.length];
    if (isEligible(seat, round.masterId, eliminated)) return seat.id;
  }
  return null;
}

export async function setCurrentAsker(roundId: string, askerId: string | null): Promise<void> {
  await prisma.round.update({ where: { id: roundId }, data: { currentAskerId: askerId } });
}

/**
 * Recompute whose turn it is after something changed (an answer landed, someone
 * passed, was eliminated or left) and persist it. Returns the new asker id.
 */
export async function advanceTurn(
  round: ActiveRound,
  afterPlayerId: string | null,
): Promise<string | null> {
  const next = await computeNextAsker(round, afterPlayerId);
  await setCurrentAsker(round.id, next);
  return next;
}

/** The first detective to act when a round starts. */
export async function firstAsker(round: ActiveRound): Promise<string | null> {
  return computeNextAsker(round, null);
}
