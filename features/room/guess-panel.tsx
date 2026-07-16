"use client";

import { useState } from "react";
import { BanIcon, LightbulbIcon, TrophyIcon } from "lucide-react";

import type { GuessDTO, PublicRound } from "@/lib/realtime/events";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { PlayerAvatar } from "@/features/room/player-avatar";
import { useRoom } from "@/features/room/room-provider";

const GUESS_MAX = 300;

/**
 * The "Já sei." button + modal. A detective's single, SECRET shot: the text
 * goes only to the master. Once used (or once eliminated) the button reflects
 * that; the server enforces the single shot regardless.
 */
export function GuessButton({ round }: { round: PublicRound }) {
  const { me, isMaster, amEliminated, submitGuess, error } = useRoom();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  if (isMaster) return null;

  const myGuess = round.guesses.find((g) => g.playerId === me?.id);
  const active = round.status === "ACTIVE";

  async function send() {
    const text = content.trim();
    if (!text || sending) return;
    setSending(true);
    const ok = await submitGuess(text);
    setSending(false);
    if (ok) {
      setContent("");
      setOpen(false);
    }
  }

  if (amEliminated) {
    return (
      <Button variant="outline" className="w-full shrink-0 sm:w-auto" disabled>
        <BanIcon /> Você está fora desta rodada
      </Button>
    );
  }

  if (myGuess) {
    const label =
      myGuess.status === "PENDING"
        ? "Chute enviado — aguardando o mestre"
        : myGuess.status === "ACCEPTED"
          ? "Você acertou!"
          : "Chute usado";
    return (
      <Button variant="outline" className="w-full shrink-0 sm:w-auto" disabled>
        <LightbulbIcon /> {label}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full shrink-0 sm:w-auto" disabled={!active}>
          <LightbulbIcon /> Já sei.
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Qual é a sua solução?</DialogTitle>
          <DialogDescription>
            Só o <strong>mestre</strong> vê o seu chute. Você tem{" "}
            <strong>uma única tentativa</strong>: se ele recusar, você fica de fora até a próxima
            rodada.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="guess">Sua explicação</Label>
          <Textarea
            id="guess"
            autoFocus
            rows={4}
            maxLength={GUESS_MAX}
            value={content}
            disabled={sending}
            placeholder="Conte o que você acha que aconteceu..."
            onChange={(e) => setContent(e.target.value)}
          />
          <p className="text-muted-foreground text-right text-[11px] tabular-nums">
            {content.length}/{GUESS_MAX}
          </p>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={sending}>
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={send} disabled={sending || !content.trim()}>
            {sending ? <Spinner size="sm" /> : <LightbulbIcon />}
            Enviar chute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GuessRow({
  guess,
  color,
  isWinner,
}: {
  guess: GuessDTO;
  color: string | null;
  isWinner: boolean;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg px-2 py-1.5">
      <PlayerAvatar name={guess.authorName} color={color} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{guess.authorName}</span>
      {isWinner ? (
        <Badge variant="success" className="gap-1">
          <TrophyIcon /> Venceu
        </Badge>
      ) : guess.status === "REJECTED" ? (
        <Badge variant="destructive">Eliminado</Badge>
      ) : (
        <Badge variant="warning">Chutou</Badge>
      )}
    </li>
  );
}

/**
 * Public scoreboard of guesses — WHO guessed and how it went, never the text.
 * The text lives only in the master's private panel and, for the winner, in the
 * reveal. Rendered only once someone has taken a shot.
 */
export function GuessPanel({ round }: { round: PublicRound }) {
  const { room } = useRoom();
  if (round.guesses.length === 0) return null;

  const colorOf = (playerId: string | null) =>
    room?.players.find((p) => p.id === playerId)?.color ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <LightbulbIcon className="text-warning size-4" /> Chutes
          <Badge variant="secondary">{round.guesses.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2">
        <ul className="space-y-0.5">
          {round.guesses.map((g) => (
            <GuessRow
              key={g.id}
              guess={g}
              color={colorOf(g.playerId)}
              isWinner={g.status === "ACCEPTED"}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
