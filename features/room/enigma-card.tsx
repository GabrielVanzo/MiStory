"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon, LockIcon, TimerIcon, UnlockIcon } from "lucide-react";

import type { PublicRound, RoundSecret } from "@/lib/realtime/events";
import { formatCountdown, useCountdown } from "@/hooks/use-countdown";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useRoom } from "@/features/room/room-provider";

const LEVEL_LABEL: Record<string, string> = {
  EASY: "Fácil",
  MEDIUM: "Médio",
  HARD: "Difícil",
};

const LEVEL_VARIANT: Record<string, "success" | "warning" | "destructive"> = {
  EASY: "success",
  MEDIUM: "warning",
  HARD: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Em andamento",
  SOLVED: "Resolvido",
  REVEALED: "Revelado",
  EXPIRED: "Tempo esgotado",
};

const STATUS_VARIANT: Record<string, "info" | "success" | "secondary" | "destructive"> = {
  ACTIVE: "info",
  SOLVED: "success",
  REVEALED: "secondary",
  EXPIRED: "destructive",
};

/** Server-driven countdown. Purely a readout of the deadline the server set. */
function RoundTimer({ expiresAt }: { expiresAt: string }) {
  const { offsetMs } = useRoom();
  const remaining = useCountdown(expiresAt, offsetMs);
  if (remaining === null) return null;

  const urgent = remaining <= 60_000;
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 font-mono text-sm tabular-nums",
        urgent ? "text-destructive" : "text-muted-foreground",
      )}
      aria-live={urgent ? "polite" : "off"}
    >
      <TimerIcon className="size-4" />
      {formatCountdown(remaining)}
    </div>
  );
}

/** Public enigma — shown to every player in the room. */
export function EnigmaCard({ round }: { round: PublicRound }) {
  const level = round.enigma.difficulty;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-muted-foreground flex items-center gap-2 font-mono text-xs">
              <span>Rodada {round.number}</span>
            </div>
            <CardTitle className="text-lg">{round.enigma.title}</CardTitle>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <Badge variant={STATUS_VARIANT[round.status] ?? "secondary"}>
                {STATUS_LABEL[round.status] ?? round.status}
              </Badge>
              <Badge variant={LEVEL_VARIANT[level] ?? "secondary"}>
                {LEVEL_LABEL[level] ?? level}
              </Badge>
            </div>
            {round.status === "ACTIVE" && round.expiresAt ? (
              <RoundTimer expiresAt={round.expiresAt} />
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-pretty">{round.enigma.teaser}</p>
      </CardContent>
    </Card>
  );
}

/**
 * HOST ONLY. Rendered from the `secret` the server delivered privately to this
 * socket — non-hosts never receive it, so there is nothing to render for them.
 */
export function HostSecretPanel({ secret }: { secret: RoundSecret }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <Card className="ring-warning/25 bg-warning/5">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-warning flex items-center gap-2 text-sm">
            <LockIcon className="size-3.5" />
            Solução — visível apenas para você
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRevealed((v) => !v)}
            aria-expanded={revealed}
          >
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
            {revealed ? "Ocultar" : "Revelar"}
          </Button>
        </div>
      </CardHeader>

      {revealed ? (
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Resposta
            </p>
            <p className="text-pretty">{secret.answer}</p>
          </div>
          <Separator />
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Explicação
            </p>
            <p className="text-muted-foreground text-sm text-pretty">{secret.explanation}</p>
          </div>
        </CardContent>
      ) : (
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Você é o mestre desta rodada. Revele para consultar a resposta e conduzir o mistério.
          </p>
        </CardContent>
      )}
    </Card>
  );
}

/**
 * The solution, now public. The server only puts `reveal` on the wire once the
 * round has actually ended.
 */
export function RoundRevealPanel({ round }: { round: PublicRound }) {
  const { room } = useRoom();
  if (!round.reveal) return null;

  const solver = round.solvedById
    ? room?.players.find((p) => p.id === round.solvedById)
    : undefined;

  return (
    <Card className="ring-primary/25 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-primary flex items-center gap-2 text-sm">
          <UnlockIcon className="size-3.5" />
          Solução revelada
        </CardTitle>
        {solver ? (
          <p className="text-muted-foreground text-sm">
            Desvendado por <span className="text-foreground font-medium">{solver.nickname}</span>.
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Resposta
          </p>
          <p className="text-pretty">{round.reveal.answer}</p>
        </div>
        <Separator />
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Explicação
          </p>
          <p className="text-muted-foreground text-sm text-pretty">{round.reveal.explanation}</p>
        </div>
      </CardContent>
    </Card>
  );
}
