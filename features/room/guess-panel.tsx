"use client";

import { useState } from "react";
import { CheckIcon, LightbulbIcon, TrophyIcon, XIcon } from "lucide-react";

import type { GuessDTO, PublicRound } from "@/lib/realtime/events";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useRoom } from "@/features/room/room-provider";

const GUESS_MAX = 300;

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

/**
 * The "Já sei." button + modal. Each detective gets exactly one shot per round;
 * once used (accepted or rejected) the button stays disabled — the server
 * enforces it regardless.
 */
export function GuessButton({ round }: { round: PublicRound }) {
  const { me, isHost, submitGuess, error } = useRoom();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  if (isHost) return null;

  const myGuess = round.guesses.find((g) => g.playerId === me?.id);
  const active = round.status === "ACTIVE";
  const spent = Boolean(myGuess);

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

  if (spent) {
    const label =
      myGuess?.status === "PENDING"
        ? "Chute enviado — aguardando o mestre"
        : myGuess?.status === "ACCEPTED"
          ? "Você acertou!"
          : "Seu chute foi usado";
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
            Você tem <strong>um único chute</strong> nesta rodada. Se o mestre recusar, não poderá
            tentar de novo.
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
  canJudge,
  isWinner,
}: {
  guess: GuessDTO;
  color: string | null;
  canJudge: boolean;
  isWinner: boolean;
}) {
  const { resolveGuess } = useRoom();
  const [pending, setPending] = useState<"accept" | "reject" | null>(null);

  async function judge(accept: boolean) {
    setPending(accept ? "accept" : "reject");
    await resolveGuess(guess.id, accept);
    setPending(null);
  }

  return (
    <li
      className={cn(
        "rounded-xl px-3 py-2.5 transition-colors",
        isWinner && "bg-success/10 ring-success/25 ring-1",
        !isWinner &&
          guess.status === "PENDING" &&
          canJudge &&
          "bg-warning/5 ring-warning/20 ring-1",
        !isWinner && guess.status === "REJECTED" && "opacity-60",
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar size="sm" className="mt-0.5 shrink-0">
          <AvatarFallback
            style={color ? { backgroundColor: `${color}22`, color } : undefined}
            className="text-[10px]"
          >
            {initials(guess.authorName)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{guess.authorName}</span>
            {isWinner ? (
              <Badge variant="success" className="gap-1">
                <TrophyIcon /> Venceu
              </Badge>
            ) : guess.status === "REJECTED" ? (
              <Badge variant="destructive">Recusado</Badge>
            ) : (
              <Badge variant="warning">Aguardando</Badge>
            )}
          </div>

          <p className="text-pretty">{guess.content}</p>

          {canJudge && guess.status === "PENDING" ? (
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={() => judge(true)} disabled={pending !== null}>
                {pending === "accept" ? <Spinner size="xs" /> : <CheckIcon />}
                Aceitar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => judge(false)}
                disabled={pending !== null}
              >
                {pending === "reject" ? <Spinner size="xs" /> : <XIcon />}
                Rejeitar
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/** The round's guesses. Rendered only once someone has taken a shot. */
export function GuessPanel({ round }: { round: PublicRound }) {
  const { room, isHost } = useRoom();
  if (round.guesses.length === 0) return null;

  const canJudge = isHost && round.status === "ACTIVE";
  const pending = round.guesses.filter((g) => g.status === "PENDING").length;
  const colorOf = (playerId: string | null) =>
    room?.players.find((p) => p.id === playerId)?.color ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <LightbulbIcon className="text-warning size-4" /> Chutes
          </span>
          {pending > 0 && canJudge ? (
            <Badge variant="warning">{pending} para julgar</Badge>
          ) : (
            <Badge variant="secondary">{round.guesses.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2">
        <ul className="space-y-1">
          {round.guesses.map((g) => (
            <GuessRow
              key={g.id}
              guess={g}
              color={colorOf(g.playerId)}
              canJudge={canJudge}
              isWinner={g.status === "ACCEPTED"}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
