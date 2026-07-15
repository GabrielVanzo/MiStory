import type {
  AnswerValue,
  Difficulty,
  GuessStatus,
  RoomStatus,
  RoundStatus,
} from "../../types/game";

/**
 * Narrowing helpers for the enum-like columns.
 *
 * SQLite has no enum type, so those columns are `String` and Prisma types them
 * as `string` — while the shared contract exposes proper unions. This module is
 * the ONE documented place where we state the assumption that bridges the two:
 *
 *   every write to these columns goes through this codebase, using values from
 *   `types/game`, so a value read back is always a member of its union.
 *
 * Keeping the assertions here (instead of scattering `as` casts across the
 * mappers) means there is a single spot to revisit if that ever stops holding —
 * e.g. after moving to PostgreSQL, where these become real enums and the casts
 * can simply disappear.
 */

export const asRoomStatus = (value: string) => value as RoomStatus;
export const asRoundStatus = (value: string) => value as RoundStatus;
export const asGuessStatus = (value: string) => value as GuessStatus;
export const asAnswerValue = (value: string) => value as AnswerValue;
export const asDifficulty = (value: string) => value as Difficulty;
