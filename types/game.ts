/**
 * Enum-like value sets for Black Stories.
 *
 * These mirror the `String` columns in `prisma/schema.prisma`. They live in
 * TypeScript because SQLite has no native enum type; on PostgreSQL they could
 * be promoted to real Prisma enums without touching the consumers.
 *
 * Values that are only ever *checked* are plain unions (no runtime cost).
 * Only the sets we actually iterate or test against exist as arrays.
 */

/** Difficulty of an enigma ("nível"). */
export type Difficulty = "EASY" | "MEDIUM" | "HARD";

/** Overall match state of a room ("Estado da Partida"). */
export type RoomStatus = "LOBBY" | "PLAYING" | "FINISHED";

/**
 * Lifecycle of a single round.
 * ACTIVE -> SOLVED (cracked) | REVEALED (host gave it away) | EXPIRED (timer ran out).
 */
export type RoundStatus = "WAITING" | "ACTIVE" | "SOLVED" | "REVEALED" | "EXPIRED" | "ABANDONED";

/** Statuses in which a round is over and its solution is public. */
export type FinishedRoundStatus = Extract<RoundStatus, "SOLVED" | "REVEALED" | "EXPIRED">;

/** How a host may end a round manually (the timer produces EXPIRED). */
export type FinishOutcome = Extract<RoundStatus, "SOLVED" | "REVEALED">;

/** Lifecycle of a player's single guess ("chute") in a round. */
export type GuessStatus = "PENDING" | "ACCEPTED" | "REJECTED";

/** Why points were awarded in the score ledger. */
export type ScoreReason = "SOLVED_ENIGMA" | "WRONG_GUESS";

/** The master's only possible replies to a question: Sim / Não / Irrelevante. */
export const ANSWER_VALUES = ["YES", "NO", "IRRELEVANT"] as const;
export type AnswerValue = (typeof ANSWER_VALUES)[number];

const FINISHED_ROUND_STATUSES: readonly FinishedRoundStatus[] = ["SOLVED", "REVEALED", "EXPIRED"];

/**
 * Point values. The spec did not fix these numbers — they are tuned here and
 * nowhere else, so balancing the game is a one-line change.
 *
 * The round's master cannot win or guess, so they never score: awarding them
 * points would just inflate whoever owns the room.
 */
export const SCORE_POINTS: Record<ScoreReason, number> = {
  /** Your guess was accepted — you cracked the enigma. */
  SOLVED_ENIGMA: 3,
  /** Your single shot was rejected. */
  WRONG_GUESS: -1,
};

export const isFinishedRoundStatus = (value: string): value is FinishedRoundStatus =>
  (FINISHED_ROUND_STATUSES as readonly string[]).includes(value);

export const isAnswerValue = (value: string): value is AnswerValue =>
  (ANSWER_VALUES as readonly string[]).includes(value);
