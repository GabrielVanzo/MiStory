"use client";

import { CrownIcon, EqualIcon, HistoryIcon, MedalIcon, TrophyIcon } from "lucide-react";

import type { LeaderboardEntry, RoundSummary } from "@/lib/realtime/events";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  EmptyState,
  EmptyStateDescription,
  EmptyStateMedia,
  EmptyStateTitle,
} from "@/components/ui/empty-state";
import { useRoom } from "@/features/room/room-provider";

const RANK_STYLE: Record<number, string> = {
  1: "bg-warning/15 text-warning ring-warning/30",
  2: "bg-muted text-foreground ring-border",
  3: "bg-primary/10 text-primary ring-primary/25",
};

const STATUS_LABEL: Record<string, string> = {
  SOLVED: "Resolvido",
  REVEALED: "Revelado",
  EXPIRED: "Tempo esgotado",
};

const STATUS_VARIANT: Record<string, "success" | "secondary" | "destructive"> = {
  SOLVED: "success",
  REVEALED: "secondary",
  EXPIRED: "destructive",
};

function LeaderboardRow({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-lg p-2 transition-colors",
        isMe ? "bg-primary/5 ring-primary/20 ring-1" : "hover:bg-muted/40",
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tabular-nums ring-1",
          RANK_STYLE[entry.rank] ?? "bg-muted/50 text-muted-foreground ring-border",
        )}
      >
        {entry.rank}
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          {entry.name}
          {isMe ? <span className="text-muted-foreground text-xs">(você)</span> : null}
          {entry.rank === 1 && entry.points > 0 ? (
            <TrophyIcon className="text-warning size-3.5" />
          ) : null}
          {!entry.isPresent ? <span className="text-muted-foreground text-xs">(saiu)</span> : null}
        </p>
        <p className="text-muted-foreground flex items-center gap-1 text-xs">
          {entry.roundsWon} {entry.roundsWon === 1 ? "rodada" : "rodadas"}
          {entry.isTied ? (
            <>
              {" · "}
              <EqualIcon className="size-3" /> empatado
            </>
          ) : null}
        </p>
      </div>

      <span
        className={cn(
          "shrink-0 font-mono text-sm font-semibold tabular-nums",
          entry.points > 0 && "text-success",
          entry.points < 0 && "text-destructive",
          entry.points === 0 && "text-muted-foreground",
        )}
      >
        {entry.points > 0 ? `+${entry.points}` : entry.points}
      </span>
    </li>
  );
}

/** Standings. Order, ranks and tie flags all come ready from the server. */
export function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  const { me } = useRoom();

  if (entries.length === 0) {
    return (
      <EmptyState className="border-0 bg-transparent py-8">
        <EmptyStateMedia>
          <MedalIcon />
        </EmptyStateMedia>
        <EmptyStateTitle>Sem pontuação ainda</EmptyStateTitle>
      </EmptyState>
    );
  }

  return (
    <ul className="space-y-1">
      {entries.map((entry) => (
        <LeaderboardRow
          key={entry.playerId ?? `left:${entry.name}`}
          entry={entry}
          isMe={entry.playerId === me?.id}
        />
      ))}
    </ul>
  );
}

/** Finished rounds, newest first. */
export function RoomHistory({ history }: { history: RoundSummary[] }) {
  if (history.length === 0) {
    return (
      <EmptyState className="border-0 bg-transparent py-8">
        <EmptyStateMedia>
          <HistoryIcon />
        </EmptyStateMedia>
        <EmptyStateTitle>Nenhuma rodada concluída</EmptyStateTitle>
        <EmptyStateDescription>O histórico aparece ao fim de cada rodada.</EmptyStateDescription>
      </EmptyState>
    );
  }

  return (
    <ul className="space-y-2">
      {history.map((round) => (
        <li key={round.id} className="bg-muted/30 space-y-1.5 rounded-lg p-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-muted-foreground font-mono text-[11px]">Rodada {round.number}</p>
              <p className="truncate text-sm font-medium">{round.enigmaTitle}</p>
            </div>
            <Badge variant={STATUS_VARIANT[round.status] ?? "secondary"}>
              {STATUS_LABEL[round.status] ?? round.status}
            </Badge>
          </div>

          {round.winnerName ? (
            <p className="text-success flex items-center gap-1 text-xs">
              <CrownIcon className="size-3" /> {round.winnerName}
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">Ninguém desvendou</p>
          )}

          <p className="text-muted-foreground text-[11px]">
            {round.questionCount} {round.questionCount === 1 ? "pergunta" : "perguntas"} ·{" "}
            {round.guessCount} {round.guessCount === 1 ? "chute" : "chutes"}
          </p>
        </li>
      ))}
    </ul>
  );
}
