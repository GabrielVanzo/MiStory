import { prisma } from "../../lib/prisma";
import type { LeaderboardEntry, RoundSummary } from "../../lib/realtime/events";
import { SCORE_POINTS, type ScoreReason } from "../../types/game";

/**
 * Append a point event to the ledger. The ledger is append-only: totals are
 * always derived from it, never stored, so the standings cannot drift.
 */
async function award(
  roomId: string,
  playerId: string,
  roundId: string | null,
  reason: ScoreReason,
): Promise<void> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, nickname: true, roomId: true },
  });
  if (!player || player.roomId !== roomId) return;

  await prisma.score.create({
    data: {
      roomId,
      playerId: player.id,
      // Snapshot: standings must stay readable if the player leaves later.
      playerName: player.nickname,
      roundId,
      points: SCORE_POINTS[reason],
      reason,
    },
  });
}

/** The winner cracked the enigma. Called once, when the round ends as SOLVED. */
export async function awardSolve(roomId: string, roundId: string, winnerId: string): Promise<void> {
  await award(roomId, winnerId, roundId, "SOLVED_ENIGMA");
}

/** The player's single shot was rejected. */
export async function awardWrongGuess(
  roomId: string,
  roundId: string,
  playerId: string,
): Promise<void> {
  await award(roomId, playerId, roundId, "WRONG_GUESS");
}

/**
 * Builds the standings from the ledger.
 *
 * Everything here — summing, ordering, ranking and detecting ties — happens on
 * the server. Clients receive a finished, ordered list.
 *
 * Ranking is "standard competition": equal points share a rank and the next
 * rank skips accordingly (1, 2, 2, 4).
 */
export async function getLeaderboard(roomId: string): Promise<LeaderboardEntry[]> {
  const [players, ledger] = await Promise.all([
    prisma.player.findMany({
      where: { roomId },
      orderBy: { joinedAt: "asc" },
      select: { id: true, nickname: true },
    }),
    prisma.score.findMany({
      where: { roomId },
      select: { playerId: true, playerName: true, points: true, reason: true },
    }),
  ]);

  // Seed with everyone currently in the room so newcomers show up at 0.
  const byKey = new Map<string, LeaderboardEntry>();
  for (const p of players) {
    byKey.set(p.id, {
      playerId: p.id,
      name: p.nickname,
      points: 0,
      roundsWon: 0,
      rank: 0,
      isTied: false,
      isPresent: true,
    });
  }

  for (const row of ledger) {
    // Orphaned rows (the player left) are grouped by their snapshot name, so
    // past standings survive. Nicknames are unique per room, so no collisions.
    const key = row.playerId ?? `left:${row.playerName}`;
    let entry = byKey.get(key);
    if (!entry) {
      entry = {
        playerId: row.playerId,
        name: row.playerName,
        points: 0,
        roundsWon: 0,
        rank: 0,
        isTied: false,
        isPresent: false,
      };
      byKey.set(key, entry);
    }
    entry.points += row.points;
    if (row.reason === "SOLVED_ENIGMA") entry.roundsWon += 1;
  }

  const entries = [...byKey.values()].sort(
    (a, b) =>
      b.points - a.points || b.roundsWon - a.roundsWon || a.name.localeCompare(b.name, "pt-BR"),
  );

  // Standard competition ranking + tie detection.
  entries.forEach((entry, index) => {
    const previous = entries[index - 1];
    entry.rank = previous && previous.points === entry.points ? previous.rank : index + 1;
  });
  for (const entry of entries) {
    entry.isTied = entries.some((other) => other !== entry && other.points === entry.points);
  }

  return entries;
}

/**
 * The room's finished rounds, newest first.
 * The winner's name comes from the ledger snapshot, so it survives even if the
 * winner has since left the room.
 */
export async function getHistory(roomId: string): Promise<RoundSummary[]> {
  const rounds = await prisma.round.findMany({
    where: { roomId, status: { in: ["SOLVED", "REVEALED", "EXPIRED"] } },
    orderBy: { number: "desc" },
    select: {
      id: true,
      number: true,
      status: true,
      endedAt: true,
      solvedById: true,
      enigma: { select: { title: true } },
      _count: { select: { questions: true, guesses: true } },
      scores: {
        where: { reason: "SOLVED_ENIGMA" },
        select: { playerName: true },
        take: 1,
      },
    },
  });

  return rounds.map((round) => ({
    id: round.id,
    number: round.number,
    enigmaTitle: round.enigma.title,
    status: round.status,
    winnerName: round.scores[0]?.playerName ?? null,
    questionCount: round._count.questions,
    guessCount: round._count.guesses,
    endedAt: round.endedAt?.toISOString() ?? null,
  }));
}
