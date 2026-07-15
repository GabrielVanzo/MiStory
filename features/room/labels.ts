import type { AnswerValue, Difficulty, RoundStatus } from "@/types/game";

/**
 * The room's shared vocabulary: one place that turns a domain value into the
 * words and colour the player sees. Previously copy-pasted across the enigma
 * card, the leaderboard and the toast rules, which is how they drift apart.
 *
 * Pure on purpose (no React, no icons) so `room-events.ts` can use it too.
 */

export type BadgeTone = "info" | "success" | "warning" | "secondary" | "destructive";

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  EASY: "Fácil",
  MEDIUM: "Médio",
  HARD: "Difícil",
};

export const DIFFICULTY_TONE: Record<Difficulty, BadgeTone> = {
  EASY: "success",
  MEDIUM: "warning",
  HARD: "destructive",
};

export const ROUND_STATUS_LABEL: Partial<Record<RoundStatus, string>> = {
  ACTIVE: "Em andamento",
  SOLVED: "Resolvido",
  REVEALED: "Revelado",
  EXPIRED: "Tempo esgotado",
};

export const ROUND_STATUS_TONE: Partial<Record<RoundStatus, BadgeTone>> = {
  ACTIVE: "info",
  SOLVED: "success",
  REVEALED: "secondary",
  EXPIRED: "destructive",
};

export const ANSWER_LABEL: Record<AnswerValue, string> = {
  YES: "Sim",
  NO: "Não",
  IRRELEVANT: "Irrelevante",
};

export const ANSWER_TONE: Record<AnswerValue, BadgeTone> = {
  YES: "success",
  NO: "destructive",
  IRRELEVANT: "secondary",
};
