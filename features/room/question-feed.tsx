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
import { ANSWER_VALUES, type AnswerValue } from "@/types/game";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  EmptyState,
  EmptyStateDescription,
  EmptyStateMedia,
  EmptyStateTitle,
} from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useRoom } from "@/features/room/room-provider";

const QUESTION_MAX = 200;

const ANSWER_META: Record<
  AnswerValue,
  {
    label: string;
    icon: typeof CheckIcon;
    badge: "success" | "destructive" | "secondary";
    active: string;
  }
> = {
  YES: { label: "Sim", icon: CheckIcon, badge: "success", active: "bg-success/15 text-success" },
  NO: {
    label: "Não",
    icon: XIcon,
    badge: "destructive",
    active: "bg-destructive/15 text-destructive",
  },
  IRRELEVANT: {
    label: "Irrelevante",
    icon: CircleSlashIcon,
    badge: "secondary",
    active: "bg-muted text-muted-foreground",
  },
};

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
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
        const meta = ANSWER_META[value];
        const isCurrent = current === value;
        const Icon = meta.icon;
        return (
          <Button
            key={value}
            size="xs"
            variant="ghost"
            aria-pressed={isCurrent}
            disabled={pending !== null}
            onClick={() => pick(value)}
            className={cn("gap-1", isCurrent && meta.active)}
          >
            {pending === value ? <Spinner size="xs" /> : <Icon />}
            {meta.label}
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
  const answered = question.answer ? ANSWER_META[question.answer.value as AnswerValue] : null;

  return (
    <li
      className={cn(
        "rounded-xl px-3 py-2.5 transition-colors",
        // Unanswered questions stand out for the host: they need action.
        !question.answer && canAnswer ? "bg-warning/5 ring-warning/20 ring-1" : "hover:bg-muted/40",
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar size="sm" className="mt-0.5 shrink-0">
          <AvatarFallback
            style={color ? { backgroundColor: `${color}22`, color } : undefined}
            className="text-[10px]"
          >
            {initials(question.authorName)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-sm font-medium">
              {question.authorName}
              {isMine ? <span className="text-muted-foreground ml-1 text-xs">(você)</span> : null}
            </span>
            <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
              {timeOf(question.createdAt)}
            </span>
          </div>

          <p className="text-pretty">{question.content}</p>

          <div className="flex items-center gap-2 pt-0.5">
            {canAnswer ? (
              <AnswerPicker question={question} />
            ) : answered ? (
              <Badge variant={answered.badge} className="gap-1">
                <answered.icon /> {answered.label}
              </Badge>
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

/** The round's question log. Identical for everyone — answers land instantly. */
export function QuestionFeed({ round }: { round: PublicRound }) {
  const { room, me, isHost } = useRoom();
  const scrollRef = useRef<HTMLDivElement>(null);
  const count = round.questions.length;
  const pending = round.questions.filter((q) => !q.answer).length;
  const canAnswer = isHost && round.status === "ACTIVE";

  // Keep the newest question in view as the log grows.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);

  const colorOf = (playerId: string | null) =>
    room?.players.find((p) => p.id === playerId)?.color ?? null;

  return (
    <Card className="flex min-h-72 flex-1 flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span>Perguntas</span>
          <span className="flex items-center gap-2">
            {pending > 0 ? <Badge variant="warning">{pending} aguardando</Badge> : null}
            <Badge variant="secondary">{count}</Badge>
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 p-0">
        {count === 0 ? (
          <div className="px-4 pb-4">
            <EmptyState className="border-0 bg-transparent py-10">
              <EmptyStateMedia>
                <MessageCircleQuestionIcon />
              </EmptyStateMedia>
              <EmptyStateTitle>Nenhuma pergunta ainda</EmptyStateTitle>
              <EmptyStateDescription>
                {isHost
                  ? "Assim que os detetives perguntarem, você responde aqui."
                  : "Faça a primeira pergunta de sim ou não."}
              </EmptyStateDescription>
            </EmptyState>
          </div>
        ) : (
          <div ref={scrollRef} className="h-full max-h-[28rem] overflow-y-auto px-2">
            <ul className="space-y-1 pb-2">
              {round.questions.map((q) => (
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

/** Composer. Hidden for the host — the master answers, never asks. */
export function AskBar({ round }: { round: PublicRound }) {
  const { askQuestion, isHost } = useRoom();
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const active = round.status === "ACTIVE";

  if (isHost) {
    return (
      <p className="text-muted-foreground py-1 text-center text-xs">
        Você é o mestre — responda às perguntas acima.
      </p>
    );
  }

  async function send() {
    const text = content.trim();
    if (!text || sending || !active) return;
    setSending(true);
    const ok = await askQuestion(text);
    if (ok) setContent("");
    setSending(false);
  }

  const remaining = QUESTION_MAX - content.length;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Input
          value={content}
          maxLength={QUESTION_MAX}
          disabled={!active || sending}
          placeholder={
            active ? "Faça uma pergunta de sim ou não..." : "A rodada não está em andamento"
          }
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
          disabled={!active || sending || !content.trim()}
          aria-label="Enviar pergunta"
        >
          {sending ? <Spinner size="sm" /> : <SendHorizontalIcon />}
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
