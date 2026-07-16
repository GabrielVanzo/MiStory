"use client";

import { CheckIcon } from "lucide-react";

import type { PublicRound } from "@/lib/realtime/events";
import { cn } from "@/lib/utils";
import { formatTime } from "@/utils/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** The questions the master answered "Sim" — the trail of confirmed facts. */
function yesQuestions(round: PublicRound) {
  return round.questions.filter((q) => q.answer?.value === "YES");
}

/**
 * A running list of everything confirmed true this round (answers === "Sim").
 * Kept deliberately compact so it fits a side rail on desktop and a collapsible
 * panel on mobile.
 */
export function YesHighlights({ round, className }: { round: PublicRound; className?: string }) {
  const yes = yesQuestions(round);

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <CheckIcon className="text-success size-4" /> Confirmado
          </span>
          <Badge variant="secondary">{yes.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto">
        {yes.length === 0 ? (
          <p className="text-muted-foreground text-sm text-balance">
            As perguntas respondidas com <span className="text-success font-medium">Sim</span>{" "}
            aparecem aqui.
          </p>
        ) : (
          <ul className="space-y-2">
            {yes.map((q) => (
              <li
                key={q.id}
                className="border-success/30 animate-in fade-in slide-in-from-left-2 border-l-2 pl-2.5"
              >
                <p className="text-sm text-pretty">{q.content}</p>
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  {q.authorName} · {formatTime(q.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
