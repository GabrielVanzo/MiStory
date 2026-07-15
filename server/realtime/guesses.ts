import { prisma } from "../../lib/prisma";
import type { GuessDTO, ResolveGuessInput, SubmitGuessInput } from "../../lib/realtime/events";
import { RealtimeError } from "../../lib/realtime/events";
import { RoomError } from "./errors";
import { requireActiveRound } from "./round-utils";
import { awardWrongGuess } from "./scores";

const GUESS_MAX = 300;

const GUESS_SELECT = {
  id: true,
  playerId: true,
  authorName: true,
  content: true,
  status: true,
  createdAt: true,
  resolvedAt: true,
} as const;

type GuessRow = {
  id: string;
  playerId: string | null;
  authorName: string;
  content: string;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
};

function toGuessDTO(g: GuessRow): GuessDTO {
  return {
    id: g.id,
    playerId: g.playerId,
    authorName: g.authorName,
    content: g.content,
    status: g.status,
    createdAt: g.createdAt.toISOString(),
    resolvedAt: g.resolvedAt?.toISOString() ?? null,
  };
}

/** Prisma unique-constraint violation (the single-shot rule at DB level). */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/** The round's guesses, oldest first. Public — everyone hears the shot. */
export async function getGuesses(roundId: string): Promise<GuessDTO[]> {
  const rows = await prisma.guess.findMany({
    where: { roundId },
    orderBy: { createdAt: "asc" },
    select: GUESS_SELECT,
  });
  return rows.map(toGuessDTO);
}

/**
 * A detective's single shot at the solution.
 * The host knows the answer, so they cannot guess. One guess per player per
 * round — enforced by a unique index, so even a race cannot buy a second shot.
 */
export async function submitGuess(
  roomId: string,
  playerId: string,
  input: SubmitGuessInput,
): Promise<GuessDTO> {
  const content = typeof input?.content === "string" ? input.content.trim() : "";
  if (!content) throw new RoomError(RealtimeError.INVALID_INPUT);

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, roomId: true, isHost: true, nickname: true },
  });
  if (!player || player.roomId !== roomId) throw new RoomError(RealtimeError.NOT_IN_ROOM);
  if (player.isHost) throw new RoomError(RealtimeError.HOST_CANNOT_GUESS);

  const round = await requireActiveRound(roomId);

  // Fast path: a second attempt is normal user behaviour, not an error — check
  // first so we don't make Prisma log a constraint violation every time. The
  // unique index below is still the source of truth (it also wins any race).
  const existing = await prisma.guess.findFirst({
    where: { roundId: round.id, playerId: player.id },
    select: { id: true },
  });
  if (existing) throw new RoomError(RealtimeError.GUESS_ALREADY_USED);

  const created = await prisma.guess
    .create({
      data: {
        roundId: round.id,
        playerId: player.id,
        authorName: player.nickname,
        content: content.slice(0, GUESS_MAX),
        status: "PENDING",
      },
      select: GUESS_SELECT,
    })
    .catch((error: unknown) => {
      // The unique index fired: this player already spent their shot.
      if (isUniqueViolation(error)) throw new RoomError(RealtimeError.GUESS_ALREADY_USED);
      throw error;
    });

  return toGuessDTO(created);
}

export interface ResolvedGuess {
  guess: GuessDTO;
  /** Set when accepted — the round should end with this player as the winner. */
  winnerId: string | null;
}

/**
 * Host-only judgement.
 * - accept  -> the guess wins; the caller ends the round with this winner.
 * - reject  -> the shot is spent; the unique index blocks any retry.
 */
export async function resolveGuess(
  roomId: string,
  playerId: string,
  input: ResolveGuessInput,
): Promise<ResolvedGuess> {
  const host = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, roomId: true, isHost: true },
  });
  if (!host || host.roomId !== roomId) throw new RoomError(RealtimeError.NOT_IN_ROOM);
  if (!host.isHost) throw new RoomError(RealtimeError.FORBIDDEN);

  const round = await requireActiveRound(roomId);

  const guess = await prisma.guess.findFirst({
    where: { id: input?.guessId, roundId: round.id },
    select: { id: true, status: true, playerId: true },
  });
  if (!guess) throw new RoomError(RealtimeError.GUESS_NOT_FOUND);
  if (guess.status !== "PENDING") throw new RoomError(RealtimeError.GUESS_ALREADY_RESOLVED);

  const accept = input?.accept === true;
  const updated = await prisma.guess.update({
    where: { id: guess.id },
    data: { status: accept ? "ACCEPTED" : "REJECTED", resolvedAt: new Date() },
    select: GUESS_SELECT,
  });

  // A wrong shot costs a point. The solve is awarded by the round lifecycle
  // (see rounds.ts), so accepting is scored exactly once, there.
  if (!accept && guess.playerId) {
    await awardWrongGuess(roomId, round.id, guess.playerId);
  }

  return { guess: toGuessDTO(updated), winnerId: accept ? guess.playerId : null };
}
