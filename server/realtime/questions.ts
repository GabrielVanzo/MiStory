import { prisma } from "../../lib/prisma";
import type { AnswerQuestionInput, AskQuestionInput, QuestionDTO } from "../../lib/realtime/events";
import { RealtimeError } from "../../lib/realtime/events";
import { isAnswerValue } from "../../types/game";
import { RoomError } from "./errors";
import { requireActiveRound } from "./round-utils";

const QUESTION_MAX = 200;

const QUESTION_SELECT = {
  id: true,
  playerId: true,
  authorName: true,
  content: true,
  createdAt: true,
  answer: { select: { value: true, createdAt: true } },
} as const;

type QuestionRow = {
  id: string;
  playerId: string | null;
  authorName: string;
  content: string;
  createdAt: Date;
  answer: { value: string; createdAt: Date } | null;
};

function toQuestionDTO(q: QuestionRow): QuestionDTO {
  return {
    id: q.id,
    playerId: q.playerId,
    authorName: q.authorName,
    content: q.content,
    createdAt: q.createdAt.toISOString(),
    answer: q.answer
      ? { value: q.answer.value, createdAt: q.answer.createdAt.toISOString() }
      : null,
  };
}

/** The round's question log, oldest first. Entirely public. */
export async function getQuestions(roundId: string): Promise<QuestionDTO[]> {
  const rows = await prisma.question.findMany({
    where: { roundId },
    orderBy: { createdAt: "asc" },
    select: QUESTION_SELECT,
  });
  return rows.map(toQuestionDTO);
}

/**
 * Ask a yes/no question in the room's active round.
 * The host narrates and already knows the answer, so they cannot ask.
 */
export async function askQuestion(
  roomId: string,
  playerId: string,
  input: AskQuestionInput,
): Promise<QuestionDTO> {
  const content = typeof input?.content === "string" ? input.content.trim() : "";
  if (!content) throw new RoomError(RealtimeError.INVALID_INPUT);

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, roomId: true, isHost: true, nickname: true },
  });
  if (!player || player.roomId !== roomId) throw new RoomError(RealtimeError.NOT_IN_ROOM);
  if (player.isHost) throw new RoomError(RealtimeError.HOST_CANNOT_ASK);

  const round = await requireActiveRound(roomId);

  const created = await prisma.question.create({
    data: {
      roundId: round.id,
      playerId: player.id,
      // Snapshot: the log must stay readable even if this player leaves later.
      authorName: player.nickname,
      content: content.slice(0, QUESTION_MAX),
    },
    select: QUESTION_SELECT,
  });

  return toQuestionDTO(created);
}

/**
 * Host-only reply. Accepts exactly YES | NO | IRRELEVANT; anything else is
 * rejected. Re-answering overwrites, so a misclick can be corrected.
 */
export async function answerQuestion(
  roomId: string,
  playerId: string,
  input: AnswerQuestionInput,
): Promise<QuestionDTO> {
  const value = typeof input?.value === "string" ? input.value : "";
  if (!isAnswerValue(value)) throw new RoomError(RealtimeError.INVALID_INPUT);

  const host = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, roomId: true, isHost: true },
  });
  if (!host || host.roomId !== roomId) throw new RoomError(RealtimeError.NOT_IN_ROOM);
  if (!host.isHost) throw new RoomError(RealtimeError.FORBIDDEN);

  const round = await requireActiveRound(roomId);

  // The question must belong to this room's active round.
  const question = await prisma.question.findFirst({
    where: { id: input?.questionId, roundId: round.id },
    select: { id: true },
  });
  if (!question) throw new RoomError(RealtimeError.QUESTION_NOT_FOUND);

  await prisma.answer.upsert({
    where: { questionId: question.id },
    create: { questionId: question.id, authorId: host.id, value },
    update: { value, authorId: host.id },
  });

  const updated = await prisma.question.findUnique({
    where: { id: question.id },
    select: QUESTION_SELECT,
  });
  if (!updated) throw new RoomError(RealtimeError.INTERNAL);
  return toQuestionDTO(updated);
}
