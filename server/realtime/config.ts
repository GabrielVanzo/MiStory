function envMs(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Lifecycle timings. Overridable via env so tests can use tiny values.
 * - hostGraceMs:     how long a host may stay offline before host is transferred.
 * - playerTtlMs:     how long an offline player keeps their seat.
 * - roomTtlMs:       how long a fully-offline room survives before deletion.
 * - roundDurationMs: how long a round runs before the SERVER expires it.
 *
 * Lives in its own module so `rooms.ts` and `rounds.ts` can share it without
 * importing each other in a cycle.
 */
export const REALTIME_CONFIG = {
  hostGraceMs: envMs(process.env.HOST_GRACE_MS, 30_000),
  playerTtlMs: envMs(process.env.PLAYER_TTL_MS, 120_000),
  roomTtlMs: envMs(process.env.ROOM_TTL_MS, 120_000),
  sweepIntervalMs: envMs(process.env.SWEEP_INTERVAL_MS, 15_000),
  roundDurationMs: envMs(process.env.ROUND_DURATION_MS, 600_000),
};
