/**
 * Per-socket rate limiting.
 *
 * The UI disables inputs while a request is in flight, but that is only the UI:
 * anyone with a console can emit in a loop. No rule may depend on the client,
 * so the limits live here.
 *
 * Sliding window over an in-memory timestamp list. Small and dependency-free —
 * enough for a single realtime node. A multi-node deployment would move this to
 * a shared store (Redis), same shape.
 */

interface Limit {
  /** Max actions allowed inside the window. */
  max: number;
  windowMs: number;
}

/**
 * Per-event budgets.
 *
 * Tuned to be invisible to humans and hostile to loops — a bot does thousands
 * per second, a person does a handful per minute, so there is a wide margin to
 * aim at. Rejected attempts count too (they still cost a query), which is why
 * these are generous: a player who hits "already used" or sends an empty guess
 * must not burn through their budget and get locked out of a later round.
 */
const LIMITS: Record<string, Limit> = {
  "room:create": { max: 5, windowMs: 60_000 },
  "room:join": { max: 20, windowMs: 60_000 },
  "question:ask": { max: 15, windowMs: 20_000 },
  "guess:submit": { max: 15, windowMs: 60_000 },
  "question:answer": { max: 60, windowMs: 20_000 },
  "guess:resolve": { max: 30, windowMs: 20_000 },
  "round:start": { max: 20, windowMs: 60_000 },
  "round:finish": { max: 20, windowMs: 60_000 },
  "match:restart": { max: 10, windowMs: 60_000 },
};

const hits = new Map<string, Map<string, number[]>>();

/**
 * Records an attempt and reports whether it is allowed.
 * Unknown events are unlimited by design (only listed ones are budgeted).
 */
export function allow(socketId: string, event: string, now: number = Date.now()): boolean {
  const limit = LIMITS[event];
  if (!limit) return true;

  let perSocket = hits.get(socketId);
  if (!perSocket) {
    perSocket = new Map();
    hits.set(socketId, perSocket);
  }

  const cutoff = now - limit.windowMs;
  const recent = (perSocket.get(event) ?? []).filter((t) => t > cutoff);

  if (recent.length >= limit.max) {
    perSocket.set(event, recent);
    return false;
  }

  recent.push(now);
  perSocket.set(event, recent);
  return true;
}

/** Drop a socket's counters when it goes away, so the map cannot grow forever. */
export function forgetSocket(socketId: string): void {
  hits.delete(socketId);
}
