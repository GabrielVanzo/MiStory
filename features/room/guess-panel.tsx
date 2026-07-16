"use client";

import { useState } from "react";
import { BanIcon, CheckIcon, LightbulbIcon, XIcon } from "lucide-react";

import type { PublicRound } from "@/lib/realtime/events";
import { Button } from "@/components/ui/button";
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

/**
 * MASTER ONLY. Pops up the moment a secret guess arrives so the accept/reject
 * buttons can never be scrolled off-screen. It stays up (no dismiss) until the
 * master decides; the server clears the pending guess and the dialog closes
 * itself. The solution is shown right here so judging needs nothing else.
 */
export function PendingGuessModal() {
  const { secret, resolveGuess } = useRoom();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const guesses = secret?.pendingGuesses ?? [];
  const open = guesses.length > 0;

  async function judge(id: string, accept: boolean) {
    setBusyKey(`${id}:${accept ? "a" : "r"}`);
    await resolveGuess(id, accept);
    setBusyKey(null);
  }

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LightbulbIcon className="text-warning size-4" />
            {guesses.length > 1 ? "Chutes para julgar" : "Chute para julgar"}
          </DialogTitle>
          <DialogDescription>
            Compare com a solução. Aceitar encerra a rodada (o detetive vence); recusar elimina o
            detetive desta história.
          </DialogDescription>
        </DialogHeader>

        {secret ? (
          <div className="bg-muted/40 rounded-lg p-3">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Resposta
            </p>
            <p className="text-sm text-pretty">{secret.answer}</p>
          </div>
        ) : null}

        <ul className="space-y-3">
          {guesses.map((g) => (
            <li key={g.id} className="bg-background/60 ring-border space-y-2 rounded-lg p-3 ring-1">
              <p className="text-muted-foreground text-xs font-medium">
                Chute de <span className="text-foreground">{g.authorName}</span>
              </p>
              <p className="text-sm text-pretty">{g.content}</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => judge(g.id, true)} disabled={busyKey !== null}>
                  {busyKey === `${g.id}:a` ? <Spinner size="xs" /> : <CheckIcon />}
                  Aceitar (vence)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => judge(g.id, false)}
                  disabled={busyKey !== null}
                >
                  {busyKey === `${g.id}:r` ? <Spinner size="xs" /> : <XIcon />}
                  Recusar (elimina)
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
