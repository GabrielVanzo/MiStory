import { prisma } from "../../lib/prisma";
import { RealtimeError } from "../../lib/realtime/events";
import { RoomError } from "./errors";

/**
 * The room's ACTIVE round, or `NO_ACTIVE_ROUND`.
 * Shared by `questions.ts` and `guesses.ts` — kept here (rather than in
 * `rounds.ts`) so neither has to import the round lifecycle module.
 */
export async function requireActiveRound(roomId: string): Promise<{ id: string }> {
  const round = await prisma.round.findFirst({
    where: { roomId, status: "ACTIVE" },
    orderBy: { number: "desc" },
    select: { id: true },
  });
  if (!round) throw new RoomError(RealtimeError.NO_ACTIVE_ROUND);
  return round;
}
