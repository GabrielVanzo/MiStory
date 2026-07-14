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

/** Lifecycle of a single round. */
export const ROUND_STATUSES = ["WAITING", "ACTIVE", "SOLVED", "ABANDONED"] as const;
export type RoundStatus = (typeof ROUND_STATUSES)[number];

/** The master's possible replies to a question. */
export const ANSWER_VALUES = ["YES", "NO", "IRRELEVANT", "UNKNOWN"] as const;
export type AnswerValue = (typeof ANSWER_VALUES)[number];

/** Why points were awarded in the score ledger. */
export const SCORE_REASONS = ["SOLVED_ENIGMA", "GOOD_QUESTION", "HOST_BONUS"] as const;
export type ScoreReason = (typeof SCORE_REASONS)[number];

function isMember<T extends readonly string[]>(values: T, value: string): value is T[number] {
  return (values as readonly string[]).includes(value);
}

export const isDifficulty = (v: string): v is Difficulty => isMember(DIFFICULTIES, v);
export const isRoomStatus = (v: string): v is RoomStatus => isMember(ROOM_STATUSES, v);
export const isRoundStatus = (v: string): v is RoundStatus => isMember(ROUND_STATUSES, v);
export const isAnswerValue = (v: string): v is AnswerValue => isMember(ANSWER_VALUES, v);
export const isScoreReason = (v: string): v is ScoreReason => isMember(SCORE_REASONS, v);
