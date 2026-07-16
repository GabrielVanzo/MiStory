import { prisma } from "../../lib/prisma";
import type { GuessDTO, ResolveGuessInput, SubmitGuessInput } from "../../lib/realtime/events";
import { RealtimeError } from "../../lib/realtime/events";
import { asGuessStatus } from "./db-enums";
import { isUniqueViolation, RoomError } from "./errors";
import { asId, asText } from "./input";
import { advanceTurn, requireActiveRound } from "./round-utils";
import { awardWrongGuess } from "./scores";

const GUESS_MAX = 300;

/**
 * PUBLIC select — no `content`. A guess text is secret: it reaches only the
 * master (via the round secret) and, if accepted, the reveal. Loading it here
 * would risk leaking it into a broadcast.
 */
const GUESS_PUBLIC_SELECT = {
  id: true,
  playerId: true,
  authorName: true,
  status: true,
  createdAt: true,
  resolvedAt: true,
} as const;

type GuessRow = {
  id: string;
  playerId: string | null;
  authorName: string;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
};

function toGuessDTO(g: GuessRow): GuessDTO {
  return {
    id: g.id,
    playerId: g.playerId,
    authorName: g.authorName,
    status: asGuessStatus(g.status),
    createdAt: g.createdAt.toISOString(),
    resolvedAt: g.resolvedAt?.toISOString() ?? null,
  };
}

/**
 * The round's guesses, oldest first. Public — but only WHO guessed and how it
 * went, never the text.
 */
export async function getGuesses(roundId: string): Promise<GuessDTO[]> {
  const rows = await prisma.guess.findMany({
    where: { roundId },
    orderBy: { createdAt: "asc" },
    select: GUESS_PUBLIC_SELECT,
  });
  return rows.map(toGuessDTO);
}

/**
 * A detective's single, SECRET shot at the solution.
 * The master narrates, so they cannot guess. One guess per player per round —
 * enforced by a unique index, so even a race cannot buy a second shot. The text
 * goes to nobody here; the master reads it via the round secret.
 */
export async function submitGuess(
  roomId: string,
  playerId: string,
  input: SubmitGuessInput,
): Promise<GuessDTO> {
  const content = asText(input?.content, GUESS_MAX);
  if (!content) throw new RoomError(RealtimeError.INVALID_INPUT);

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, roomId: true, nickname: true },
  });
  if (!player || player.roomId !== roomId) throw new RoomError(RealtimeError.NOT_IN_ROOM);

  const round = await requireActiveRound(roomId);
  if (round.masterId === playerId) throw new RoomError(RealtimeError.MASTER_CANNOT_GUESS);

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
        content,
        status: "PENDING",
      },
      select: GUESS_PUBLIC_SELECT,
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
 * Master-only judgement.
 * - accept -> the guess wins; the caller ends the round with this winner.
 * - reject -> the guesser is ELIMINATED (their shot is spent AND they drop out
 *   of the round's turn queue). Costs a point; if it was their turn, it moves on.
 */
export async function resolveGuess(
  roomId: string,
  playerId: string,
  input: ResolveGuessInput,
): Promise<ResolvedGuess> {
  const round = await requireActiveRound(roomId);
  if (round.masterId !== playerId) throw new RoomError(RealtimeError.FORBIDDEN);

  const guess = await prisma.guess.findFirst({
    // asId: a raw value here would let a client inject a Prisma operator.
    where: { id: asId(input?.guessId), roundId: round.id },
    select: { id: true, status: true, playerId: true },
  });
  if (!guess) throw new RoomError(RealtimeError.GUESS_NOT_FOUND);
  if (guess.status !== "PENDING") throw new RoomError(RealtimeError.GUESS_ALREADY_RESOLVED);

  const accept = input?.accept === true;
  const updated = await prisma.guess.update({
    where: { id: guess.id },
    data: { status: accept ? "ACCEPTED" : "REJECTED", resolvedAt: new Date() },
    select: GUESS_PUBLIC_SELECT,
  });

  if (!accept && guess.playerId) {
    // A wrong shot costs a point (the solve is scored by the round lifecycle).
    await awardWrongGuess(roomId, round.id, guess.playerId);
    // The guesser is now eliminated — if it was their turn, pass it on.
    if (round.currentAskerId === guess.playerId) {
      await advanceTurn(round, guess.playerId);
    }
  }

  return { guess: toGuessDTO(updated), winnerId: accept ? guess.playerId : null };
}
