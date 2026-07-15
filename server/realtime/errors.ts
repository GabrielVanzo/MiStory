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
