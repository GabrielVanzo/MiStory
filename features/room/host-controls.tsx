"use client";

import { useState } from "react";
import { CheckIcon, PlayIcon, RotateCcwIcon, SparklesIcon, UnlockIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useRoom } from "@/features/room/room-provider";

/**
 * Round controls, split by role. The MASTER can end the running round; the HOST
 * starts the next one / restarts the match. The server validates both.
 */
export function RoundControls() {
  const { room, me, isHost, isMaster, busy, beginRound, finishRound, startRound, restartMatch } =
    useRoom();
  const [solvedBy, setSolvedBy] = useState<string>("");

  if (!room?.round) return null;
  const round = room.round;

  // Waiting to begin: the master reads the story, then starts the clock. The
  // countdown and questions only open up after this.
  if (round.status === "WAITING") {
    if (!isMaster) {
      return (
        <p className="text-muted-foreground py-1 text-center text-sm">
          O mestre está lendo a história. A rodada começa em instantes.
        </p>
      );
    }
    return (
      <Card size="sm">
        <CardContent className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-muted-foreground text-sm">
            Leia a solução em segredo e comece quando estiver pronto.
          </p>
          <Button onClick={beginRound} disabled={busy}>
            {busy ? <Spinner size="sm" /> : <PlayIcon />}
            Iniciar rodada
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Running round: only the master can close it (usually a guess does it, but
  // they may also mark a verbal solve or just reveal).
  if (round.status === "ACTIVE") {
    if (!isMaster) return null;
    // Detectives who are still in the round are eligible "solvers".
    const eliminated = new Set(
      round.guesses.filter((g) => g.status === "REJECTED").map((g) => g.playerId),
    );
    const candidates = room.players.filter((p) => p.id !== me?.id && !eliminated.has(p.id));

    return (
      <Card size="sm">
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Select value={solvedBy} onValueChange={setSolvedBy} disabled={busy}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Quem desvendou? (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nickname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => finishRound("SOLVED", solvedBy || undefined)} disabled={busy}>
              {busy ? <Spinner size="sm" /> : <CheckIcon />}
              Resolvido
            </Button>
            <Button variant="outline" onClick={() => finishRound("REVEALED")} disabled={busy}>
              <UnlockIcon />
              Revelar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Round over: the host moves the match forward.
  if (!isHost) {
    return (
      <p className="text-muted-foreground py-1 text-center text-sm">
        Aguardando o anfitrião iniciar a próxima rodada.
      </p>
    );
  }

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={restartMatch} disabled={busy}>
          <RotateCcwIcon /> Reiniciar partida
        </Button>
        <Button onClick={startRound} disabled={busy}>
          {busy ? <Spinner size="sm" /> : <SparklesIcon />}
          Nova rodada
        </Button>
      </CardContent>
    </Card>
  );
}
