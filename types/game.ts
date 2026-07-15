/**
 * Enum-like value sets for Black Stories.
 *
 * These mirror the `String` status/kind columns in `prisma/schema.prisma`.
 * They live in TypeScript because SQLite has no native enum type; on
 * PostgreSQL these could be promoted to native Prisma enums without changing
 * the application code that consumes these unions.
 */

export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Overall match state of a room ("Estado da Partida"). */
export const ROOM_STATUSES = ["LOBBY", "PLAYING", "FINISHED"] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];

/**
 * Lifecycle of a single round.
 * ACTIVE -> SOLVED (cracked) | REVEALED (host gave it away) | EXPIRED (timer ran out).
 */
export const ROUND_STATUSES = [
  "WAITING",
  "ACTIVE",
  "SOLVED",
  "REVEALED",
  "EXPIRED",
  "ABANDONED",
] as const;
export type RoundStatus = (typeof ROUND_STATUSES)[number];

/** Statuses in which a round is over and its solution is public. */
export const FINISHED_ROUND_STATUSES = ["SOLVED", "REVEALED", "EXPIRED"] as const;
export type FinishedRoundStatus = (typeof FINISHED_ROUND_STATUSES)[number];

/** How a host may end a round manually (the timer produces EXPIRED). */
export const FINISH_OUTCOMES = ["SOLVED", "REVEALED"] as const;
export type FinishOutcome = (typeof FINISH_OUTCOMES)[number];

export const isFinishedRoundStatus = (v: string): v is FinishedRoundStatus =>
  (FINISHED_ROUND_STATUSES as readonly string[]).includes(v);

/** The master's only possible replies to a question: Sim / Não / Irrelevante. */
export const ANSWER_VALUES = ["YES", "NO", "IRRELEVANT"] as const;
export type AnswerValue = (typeof ANSWER_VALUES)[number];

/** Lifecycle of a player's single guess ("chute") in a round. */
export const GUESS_STATUSES = ["PENDING", "ACCEPTED", "REJECTED"] as const;
export type GuessStatus = (typeof GUESS_STATUSES)[number];

/** Why points were awarded in the score ledger. */
export const SCORE_REASONS = ["SOLVED_ENIGMA", "WRONG_GUESS"] as const;
export type ScoreReason = (typeof SCORE_REASONS)[number];

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

function isMember<T extends readonly string[]>(values: T, value: string): value is T[number] {
  return (values as readonly string[]).includes(value);
}

export const isDifficulty = (v: string): v is Difficulty => isMember(DIFFICULTIES, v);
export const isRoomStatus = (v: string): v is RoomStatus => isMember(ROOM_STATUSES, v);
export const isRoundStatus = (v: string): v is RoundStatus => isMember(ROUND_STATUSES, v);
export const isAnswerValue = (v: string): v is AnswerValue => isMember(ANSWER_VALUES, v);
export const isScoreReason = (v: string): v is ScoreReason => isMember(SCORE_REASONS, v);
