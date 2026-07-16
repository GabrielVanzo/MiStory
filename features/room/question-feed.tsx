"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckIcon,
  CircleSlashIcon,
  ClockIcon,
  MessageCircleQuestionIcon,
  SendHorizontalIcon,
  XIcon,
} from "lucide-react";

import type { PublicRound, QuestionDTO } from "@/lib/realtime/events";
import { cn } from "@/lib/utils";
import { formatTime } from "@/utils/format";
import { ANSWER_VALUES, type AnswerValue } from "@/types/game";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  EmptyState,
  EmptyStateDescription,
  EmptyStateMedia,
  EmptyStateTitle,
} from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ANSWER_LABEL, ANSWER_TONE } from "@/features/room/labels";
import { PlayerAvatar } from "@/features/room/player-avatar";
import { useRoom } from "@/features/room/room-provider";

const QUESTION_MAX = 200;

/**
 * Only what is specific to this view: the icon and the "selected" styling.
 * The words and the badge colour come from the shared vocabulary, so the feed,
 * the toasts and the rest of the room can never disagree about what "NO" means.
 */
const ANSWER_ICON: Record<AnswerValue, typeof CheckIcon> = {
  YES: CheckIcon,
  NO: XIcon,
  IRRELEVANT: CircleSlashIcon,
};

const ANSWER_ACTIVE: Record<AnswerValue, string> = {
  YES: "bg-success/15 text-success",
  NO: "bg-destructive/15 text-destructive",
  IRRELEVANT: "bg-muted text-muted-foreground",
};

/** The master's reply, shown the same way everywhere. */
function AnswerBadge({ value }: { value: AnswerValue }) {
  const Icon = ANSWER_ICON[value];
  return (
    <Badge variant={ANSWER_TONE[value]} className="gap-1">
      <Icon /> {ANSWER_LABEL[value]}
    </Badge>
  );
}

/** Host's segmented control — the current answer stays highlighted and can be changed. */
function AnswerPicker({ question }: { question: QuestionDTO }) {
  const { answerQuestion } = useRoom();
  const [pending, setPending] = useState<AnswerValue | null>(null);
  const current = question.answer?.value;

  async function pick(value: AnswerValue) {
    if (value === current) return;
    setPending(value);
    await answerQuestion(question.id, value);
    setPending(null);
  }

  return (
    <div className="bg-muted/40 ring-border inline-flex items-center gap-0.5 rounded-lg p-0.5 ring-1">
      {ANSWER_VALUES.map((value) => {
        const isCurrent = current === value;
        const Icon = ANSWER_ICON[value];
        return (
          <Button
            key={value}
            size="xs"
            variant="ghost"
            aria-pressed={isCurrent}
            disabled={pending !== null}
            onClick={() => pick(value)}
            className={cn("gap-1", isCurrent && ANSWER_ACTIVE[value])}
          >
            {pending === value ? <Spinner size="xs" /> : <Icon />}
            {ANSWER_LABEL[value]}
          </Button>
        );
      })}
    </div>
  );
}

function QuestionRow({
  question,
  color,
  isMine,
  canAnswer,
}: {
  question: QuestionDTO;
  color: string | null;
  isMine: boolean;
  canAnswer: boolean;
}) {
  const answer = question.answer;

  return (
    <li
      className={cn(
        "animate-in fade-in slide-in-from-bottom-2 rounded-xl px-3 py-2.5 transition-colors duration-300",
        // Unanswered questions stand out for the host: they need action.
        !question.answer && canAnswer ? "bg-warning/5 ring-warning/20 ring-1" : "hover:bg-muted/40",
      )}
    >
      <div className="flex items-start gap-3">
        <PlayerAvatar name={question.authorName} color={color} className="mt-0.5" />

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-sm font-medium">
              {question.authorName}
              {isMine ? <span className="text-muted-foreground ml-1 text-xs">(você)</span> : null}
            </span>
            <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
              {formatTime(question.createdAt)}
            </span>
          </div>

          <p className="text-pretty">{question.content}</p>

          <div className="flex items-center gap-2 pt-0.5">
            {canAnswer ? (
              <AnswerPicker question={question} />
            ) : answer ? (
              <AnswerBadge value={answer.value} />
            ) : (
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <ClockIcon className="size-3" /> Aguardando o mestre...
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * The round's question log. Identical for everyone — answers land instantly.
 * `filter="yes"` narrows it to the confirmed ("Sim") questions; the feed is the
 * one scrolling region inside the room's app-shell, so it grows to fill height.
 */
export function QuestionFeed({
  round,
  filter = "all",
}: {
  round: PublicRound;
  filter?: "all" | "yes";
}) {
  const { room, me, isMaster } = useRoom();
  const scrollRef = useRef<HTMLDivElement>(null);
  const pending = round.questions.filter((q) => !q.answer).length;
  const canAnswer = isMaster && round.status === "ACTIVE";
  const shown =
    filter === "yes" ? round.questions.filter((q) => q.answer?.value === "YES") : round.questions;

  // Keep the newest question in view as the log grows.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown.length]);

  const colorOf = (playerId: string | null) =>
    room?.players.find((p) => p.id === playerId)?.color ?? null;

  return (
    <Card className="flex min-h-0 flex-1 flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span>{filter === "yes" ? "Confirmado (Sim)" : "Perguntas"}</span>
          <span className="flex items-center gap-2">
            {filter === "all" && pending > 0 ? (
              <Badge variant="warning">{pending} aguardando</Badge>
            ) : null}
            <Badge variant="secondary">{shown.length}</Badge>
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 p-0">
        {shown.length === 0 ? (
          <div className="px-4 pb-4">
            <EmptyState className="border-0 bg-transparent py-10">
              <EmptyStateMedia>
                <MessageCircleQuestionIcon />
              </EmptyStateMedia>
              <EmptyStateTitle>
                {filter === "yes" ? "Nada confirmado ainda" : "Nenhuma pergunta ainda"}
              </EmptyStateTitle>
              <EmptyStateDescription>
                {filter === "yes"
                  ? 'As perguntas respondidas com "Sim" aparecem aqui.'
                  : isMaster
                    ? "Assim que os detetives perguntarem, você responde aqui."
                    : "As perguntas de sim ou não aparecem aqui."}
              </EmptyStateDescription>
            </EmptyState>
          </div>
        ) : (
          <div ref={scrollRef} className="h-full overflow-y-auto px-2">
            {/* Answers land without any action from the reader, so they must be
                announced rather than silently appear. */}
            <ul className="space-y-1 pb-2" aria-live="polite" aria-relevant="additions text">
              {shown.map((q) => (
                <QuestionRow
                  key={q.id}
                  question={q}
                  color={colorOf(q.playerId)}
                  isMine={q.playerId === me?.id}
                  canAnswer={canAnswer}
                />
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Composer. A detective can ALWAYS draft their question — the input stays live
 * even when it isn't their turn — but Enviar / Passar unlock only on their turn
 * (and once the master has started the round). The master answers (never asks)
 * and an eliminated player is out.
 */
export function AskBar({ round }: { round: PublicRound }) {
  const { askQuestion, passTurn, isMaster, isWaiting, isMyTurn, amEliminated, room } = useRoom();
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [passing, setPassing] = useState(false);

  if (isMaster) {
    return (
      <p className="text-muted-foreground py-1 text-center text-xs">
        Você é o mestre — responda às perguntas acima.
      </p>
    );
  }

  if (amEliminated) {
    return (
      <p className="text-muted-foreground py-1 text-center text-xs">
        Você está fora desta rodada. Aguarde a próxima história.
      </p>
    );
  }

  // Send/pass are live only when the round is running AND it's my turn. The
  // draft box itself is always editable so you can prepare ahead.
  const active = round.status === "ACTIVE";
  const canAct = active && isMyTurn;
  const asker = round.currentAskerId
    ? room?.players.find((p) => p.id === round.currentAskerId)
    : null;

  async function send() {
    const text = content.trim();
    if (!text || sending || !canAct) return;
    setSending(true);
    const ok = await askQuestion(text);
    if (ok) setContent("");
    setSending(false);
  }

  async function pass() {
    if (passing || !canAct) return;
    setPassing(true);
    await passTurn();
    setPassing(false);
  }

  const remaining = QUESTION_MAX - content.length;

  return (
    <div className="space-y-1">
      <p
        className={cn(
          "text-center text-xs font-medium",
          canAct ? "text-primary" : "text-muted-foreground",
        )}
      >
        {isWaiting ? (
          "Aguarde o mestre iniciar a rodada — você já pode escrever."
        ) : canAct ? (
          "É a sua vez de perguntar"
        ) : asker ? (
          <>
            Vez de <span className="text-foreground font-medium">{asker.nickname}</span> — escreva e
            envie quando for a sua.
          </>
        ) : (
          "Escreva sua pergunta e aguarde a sua vez."
        )}
      </p>
      <div className="flex items-center gap-2">
        <Input
          value={content}
          maxLength={QUESTION_MAX}
          disabled={sending || passing}
          placeholder="Faça uma pergunta de sim ou não..."
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          className="h-10"
        />
        <Button
          size="icon"
          className="size-10 shrink-0"
          onClick={send}
          disabled={sending || passing || !canAct || !content.trim()}
          aria-label="Enviar pergunta"
        >
          {sending ? <Spinner size="sm" /> : <SendHorizontalIcon />}
        </Button>
        <Button
          variant="outline"
          className="h-10 shrink-0"
          onClick={pass}
          disabled={sending || passing || !canAct}
        >
          {passing ? <Spinner size="sm" /> : null} Passar
        </Button>
      </div>
      {remaining <= 40 ? (
        <p className="text-muted-foreground text-right text-[11px] tabular-nums">
          {remaining} caracteres restantes
        </p>
      ) : null}
    </div>
  );
}
