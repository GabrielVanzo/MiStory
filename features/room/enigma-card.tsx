"use client";

import { useState } from "react";
import {
  EyeIcon,
  EyeOffIcon,
  HourglassIcon,
  LockIcon,
  PauseIcon,
  TimerIcon,
  UnlockIcon,
} from "lucide-react";

import type { PublicRound, RoundSecret } from "@/lib/realtime/events";
import { useCountdown } from "@/hooks/use-countdown";
import { formatCountdown } from "@/utils/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DIFFICULTY_LABEL,
  DIFFICULTY_TONE,
  ROUND_STATUS_LABEL,
  ROUND_STATUS_TONE,
} from "@/features/room/labels";
import { useRoom } from "@/features/room/room-provider";

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
        urgent ? "text-destructive animate-pulse" : "text-muted-foreground",
      )}
      aria-live={urgent ? "polite" : "off"}
    >
      <TimerIcon className="size-4" />
      {formatCountdown(remaining)}
    </div>
  );
}

/** Frozen countdown shown while the clock is paused for a pending guess. */
function PausedTimer({ remainingMs }: { remainingMs: number }) {
  return (
    <div
      className="text-warning flex items-center gap-1.5 font-mono text-sm tabular-nums"
      aria-live="polite"
    >
      <PauseIcon className="size-4" />
      {formatCountdown(remainingMs)}
      <span className="font-sans text-xs">pausado</span>
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
              <Badge variant={ROUND_STATUS_TONE[round.status] ?? "secondary"}>
                {ROUND_STATUS_LABEL[round.status] ?? round.status}
              </Badge>
              <Badge variant={DIFFICULTY_TONE[level]}>{DIFFICULTY_LABEL[level]}</Badge>
            </div>
            {round.status === "ACTIVE" && round.expiresAt ? (
              <RoundTimer expiresAt={round.expiresAt} />
            ) : round.status === "ACTIVE" && round.pausedRemainingMs != null ? (
              <PausedTimer remainingMs={round.pausedRemainingMs} />
            ) : round.status === "WAITING" ? (
              <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                <HourglassIcon className="size-4" /> À espera do mestre
              </span>
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
 * MASTER ONLY. Rendered from the `secret` the server delivered privately to this
 * socket — nobody else receives it. Holds the answer/explanation for reference
 * while running the round. Guesses are judged in `PendingGuessModal`, not here.
 */
export function MasterSecretPanel({ secret }: { secret: RoundSecret }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <Card className="ring-warning/25 bg-warning/5">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-warning flex items-center gap-2 text-sm">
            <LockIcon className="size-3.5" />
            Você é o mestre — visível apenas para você
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRevealed((v) => !v)}
            aria-expanded={revealed}
          >
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
            {revealed ? "Ocultar" : "Ver solução"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {revealed ? (
          <div className="space-y-3">
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
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Responda às perguntas. Quando alguém chutar, você julga na janela que aparece. Ninguém
            mais vê esta caixa.
          </p>
        )}
      </CardContent>
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
    <Card className="ring-primary/25 bg-primary/5 animate-in fade-in zoom-in-95 duration-500">
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
        {round.reveal.winnerGuess ? (
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Chute vencedor
            </p>
            <p className="text-pretty italic">“{round.reveal.winnerGuess}”</p>
            <Separator className="mt-3" />
          </div>
        ) : null}
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
