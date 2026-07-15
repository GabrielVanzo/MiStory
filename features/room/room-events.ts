import type { RoomState } from "@/lib/realtime/events";
import { ANSWER_LABEL } from "@/features/room/labels";

/** How a notification should be presented. */
export type RoomEventTone = "plain" | "info" | "success" | "warning" | "error";

export interface RoomEvent {
  /** Stable identifier, handy for tests and debugging. */
  kind: string;
  tone: RoomEventTone;
  title: string;
  description?: string;
}

const byId = <T extends { id: string }>(items: T[] | undefined) =>
  new Map((items ?? []).map((item) => [item.id, item]));

/**
 * Pure diff between two room snapshots — returns what is worth announcing.
 *
 * Kept free of React and of the toast library so the rules can be tested
 * directly. `previous` is null on the very first snapshot, which yields no
 * events: arriving in a room must never fire a burst of notifications.
 *
 * Deliberately quiet: presence dots already show online/offline and the feed
 * already rings unanswered questions, so neither is announced. Only what you
 * would otherwise miss — or must act on — gets through.
 */
export function diffRoomEvents(
  previous: RoomState | null,
  next: RoomState | null,
  myId: string | null,
  isHost: boolean,
): RoomEvent[] {
  if (!previous || !next) return [];
  const events: RoomEvent[] = [];

  // ---------------------------------------------------------- players
  const previousPlayers = new Set(previous.players.map((p) => p.id));
  const currentPlayers = new Set(next.players.map((p) => p.id));

  for (const player of next.players) {
    if (!previousPlayers.has(player.id) && player.id !== myId) {
      events.push({
        kind: "player:joined",
        tone: "plain",
        title: `${player.nickname} entrou na sala`,
      });
    }
  }
  for (const player of previous.players) {
    if (!currentPlayers.has(player.id) && player.id !== myId) {
      events.push({ kind: "player:left", tone: "plain", title: `${player.nickname} saiu da sala` });
    }
  }

  // ---------------------------------------------------------- host transfer
  if (previous.hostId !== next.hostId && next.hostId) {
    if (next.hostId === myId) {
      events.push({
        kind: "host:me",
        tone: "info",
        title: "Você agora é o anfitrião",
        description: "Você conduz a partida e vê a solução.",
      });
    } else {
      const host = next.players.find((p) => p.id === next.hostId);
      if (host) {
        events.push({
          kind: "host:other",
          tone: "info",
          title: `${host.nickname} agora é o anfitrião`,
        });
      }
    }
  }

  const round = next.round;
  const previousRound = previous.round;

  // ---------------------------------------------------------- round start
  if (round && round.id !== previousRound?.id && round.status === "ACTIVE") {
    events.push({
      kind: "round:started",
      tone: "success",
      title: `Rodada ${round.number} começou!`,
      description: round.enigma.title,
    });
  }

  // ---------------------------------------------------------- round end
  const sameRound = round && previousRound && round.id === previousRound.id;
  if (sameRound && previousRound.status === "ACTIVE" && round.status !== "ACTIVE") {
    if (round.status === "SOLVED") {
      if (round.solvedById === myId) {
        events.push({
          kind: "round:won",
          tone: "success",
          title: "Você desvendou o enigma! 🏆",
          description: "+3 pontos",
        });
      } else {
        const winner = next.players.find((p) => p.id === round.solvedById);
        events.push({
          kind: "round:solved",
          tone: "success",
          title: `${winner?.nickname ?? "Alguém"} desvendou o enigma!`,
        });
      }
    } else if (round.status === "EXPIRED") {
      events.push({
        kind: "round:expired",
        tone: "warning",
        title: "Tempo esgotado!",
        description: "A solução foi revelada.",
      });
    } else if (round.status === "REVEALED") {
      events.push({ kind: "round:revealed", tone: "info", title: "O mestre revelou a solução" });
    }
  }

  const previousQuestions = byId(previousRound?.questions);
  const previousGuesses = byId(previousRound?.guesses);

  // ---------------------------------------------------------- my question answered
  for (const question of round?.questions ?? []) {
    if (question.playerId !== myId || !question.answer) continue;
    const before = previousQuestions.get(question.id);
    if (!before || before.answer) continue;

    const value = question.answer.value;
    events.push({
      kind: "question:answered",
      tone: value === "YES" ? "success" : value === "NO" ? "error" : "info",
      title: `Resposta: ${ANSWER_LABEL[value]}`,
      description: question.content,
    });
  }

  // ---------------------------------------------------------- my guess judged
  // A win is already celebrated by the round-end event above, so only the
  // rejection needs its own — it is the one that costs you something.
  for (const guess of round?.guesses ?? []) {
    if (guess.playerId !== myId) continue;
    const before = previousGuesses.get(guess.id);
    if (before?.status === "PENDING" && guess.status === "REJECTED") {
      events.push({
        kind: "guess:rejected",
        tone: "error",
        title: "Chute recusado",
        description: "Você não pode tentar novamente nesta rodada.",
      });
    }
  }

  // ---------------------------------------------------------- host: a guess needs judging
  // Questions are NOT announced: they arrive often and the feed already rings
  // them. A guess is rare and blocks the round, so it earns an interruption.
  if (isHost) {
    for (const guess of round?.guesses ?? []) {
      if (!previousGuesses.has(guess.id) && guess.status === "PENDING") {
        events.push({
          kind: "guess:needs-judging",
          tone: "warning",
          title: `${guess.authorName} acha que já sabe!`,
          description: "Aceite ou rejeite o chute.",
        });
      }
    }
  }

  return events;
}
