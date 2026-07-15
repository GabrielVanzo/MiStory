import type { RealtimeErrorCode } from "../../lib/realtime/events";

/**
 * Domain error carrying a stable code the client can localize.
 * Lives in its own module so `rooms.ts` and `rounds.ts` can both use it
 * without importing each other in a cycle.
 */
export class RoomError extends Error {
  constructor(public code: RealtimeErrorCode) {
    super(code);
    this.name = "RoomError";
  }
}

/**
 * Prisma unique-constraint violation (P2002), detected structurally so we do
 * not have to import Prisma's error classes. Shared: both room joins and
 * guesses rely on a unique index as their source of truth.
 */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
