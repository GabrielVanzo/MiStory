/**
 * Input sanitizers for everything that arrives from a client.
 *
 * WHY THIS EXISTS
 * ---------------
 * Socket.IO payloads are JSON, so a client can send an **object** where the
 * server expects a string. If such a value reaches a Prisma `where` clause,
 * Prisma reads it as a *filter operator* instead of a literal:
 *
 *     where: { sessionToken: { not: null } }   // matches ANY player!
 *
 * That is an operator-injection hole (the NoSQL-injection family). A real
 * exploit against `room:join` let an attacker take over the host's identity —
 * and with it the enigma's answer — knowing only the room code.
 *
 * Rule: never pass a raw client value into a query. Coerce it here first.
 * Anything that is not the expected primitive collapses to a harmless value.
 */

/** Trimmed string, capped. Anything non-string becomes "". */
export function asText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * An identifier safe to put in a `where` clause. Non-strings become "" — which
 * matches nothing — instead of turning into a Prisma operator.
 */
export function asId(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Integer clamped to [min, max]; anything unparseable falls back. */
export function asInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

/** Strict boolean: only a real `true`/`false` counts, never "false" or 0. */
export function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}
