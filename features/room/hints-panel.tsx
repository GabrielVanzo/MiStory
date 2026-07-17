"use client";

import { useState } from "react";
import { LightbulbIcon, SparklesIcon } from "lucide-react";

import type { PublicRound } from "@/lib/realtime/events";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useRoom } from "@/features/room/room-provider";

/**
 * Progressive story hints. Detectives unlock a new one for every
 * `min(detetives × 4, 16)` questions answered "Não"/"Irrelevante"; the master
 * chooses when to release each. Everyone sees the released hints here; only the
 * master gets the release button (and a private preview of the next hint).
 */
export function HintsPanel({ round }: { round: PublicRound }) {
  const { isMaster, secret, releaseHint } = useRoom();
  const [releasing, setReleasing] = useState(false);

  const released = round.hints;
  // > 0 means a new hint is unlocked and waiting to be released.
  const unreleased = round.hintsAvailable - released.length;

  // Nothing revealed and nothing waiting -> keep the room uncluttered.
  if (released.length === 0 && unreleased <= 0) return null;

  const nextHint = secret?.hints[released.length]; // master-only preview

  async function release() {
    setReleasing(true);
    await releaseHint();
    setReleasing(false);
  }

  return (
    <Card className="ring-warning/20 bg-warning/5">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <LightbulbIcon className="text-warning size-4" /> Dicas
          </span>
          {released.length > 0 ? <Badge variant="secondary">{released.length}</Badge> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {released.length > 0 ? (
          <ol className="space-y-2">
            {released.map((hint, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-warning shrink-0 font-mono text-xs">{i + 1}.</span>
                <span className="text-pretty">{hint}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-muted-foreground text-sm">Nenhuma dica revelada ainda.</p>
        )}

        {unreleased > 0 ? (
          isMaster ? (
            <div className="space-y-2">
              {nextHint ? (
                <p className="text-muted-foreground text-xs">
                  Próxima: <span className="text-foreground">{nextHint}</span>
                </p>
              ) : null}
              <Button size="sm" onClick={release} disabled={releasing}>
                {releasing ? <Spinner size="xs" /> : <SparklesIcon />}
                Liberar dica {released.length + 1}
              </Button>
            </div>
          ) : (
            <p className="text-warning/90 text-xs font-medium">
              Uma nova dica está disponível — aguarde o mestre liberar.
            </p>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
