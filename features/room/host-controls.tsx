"use client";

import { useState } from "react";
import { CheckIcon, RotateCcwIcon, SparklesIcon, UnlockIcon } from "lucide-react";

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
 * Host-only match controls. Every action is a request — the server validates
 * that the caller is the host and owns all state transitions.
 */
export function HostControls() {
  const { room, me, busy, finishRound, startRound, restartMatch } = useRoom();
  const [solvedBy, setSolvedBy] = useState<string>("");

  if (!room?.round) return null;
  const round = room.round;
  const others = room.players.filter((p) => p.id !== me?.id);

  // Round running -> the host can close it.
  if (round.status === "ACTIVE") {
    return (
      <Card size="sm">
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Select value={solvedBy} onValueChange={setSolvedBy} disabled={busy}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Quem desvendou? (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {others.map((p) => (
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

  // Round over -> next round or restart the match.
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
