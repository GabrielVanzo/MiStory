import { prisma } from "../../lib/prisma";
import type { AnswerQuestionInput, AskQuestionInput, QuestionDTO } from "../../lib/realtime/events";
import { RealtimeError } from "../../lib/realtime/events";
import { isAnswerValue } from "../../types/game";
import { asAnswerValue } from "./db-enums";
import { RoomError } from "./errors";
import { asId, asText } from "./input";
import {
  advanceTurn,
  getEliminatedIds,
  hasPendingQuestion,
  requireActiveRound,
} from "./round-utils";

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
      ? { value: asAnswerValue(q.answer.value), createdAt: q.answer.createdAt.toISOString() }
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
 * Ask a yes/no question — only the detective whose TURN it is, and only when no
 * question is still awaiting the master (one open question at a time keeps the
 * feed orderly). The master narrates, so they cannot ask.
 */
export async function askQuestion(
  roomId: string,
  playerId: string,
  input: AskQuestionInput,
): Promise<QuestionDTO> {
  const content = asText(input?.content, QUESTION_MAX);
  if (!content) throw new RoomError(RealtimeError.INVALID_INPUT);

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, roomId: true, nickname: true },
  });
  if (!player || player.roomId !== roomId) throw new RoomError(RealtimeError.NOT_IN_ROOM);

  const round = await requireActiveRound(roomId);
  if (round.masterId === playerId) throw new RoomError(RealtimeError.MASTER_CANNOT_ASK);

  const eliminated = await getEliminatedIds(round.id);
  if (eliminated.has(playerId)) throw new RoomError(RealtimeError.ELIMINATED);

  if (round.currentAskerId !== playerId) throw new RoomError(RealtimeError.NOT_YOUR_TURN);
  // While a question is still open the turn has not moved on — no double-asking.
  if (await hasPendingQuestion(round.id)) throw new RoomError(RealtimeError.NOT_YOUR_TURN);

  const created = await prisma.question.create({
    data: {
      roundId: round.id,
      playerId: player.id,
      // Snapshot: the log stays readable even if this player leaves later.
      authorName: player.nickname,
      content,
    },
    select: QUESTION_SELECT,
  });

  return toQuestionDTO(created);
}

/**
 * Master-only reply. Accepts exactly YES | NO | IRRELEVANT. Answering the open
 * question moves the turn to the next detective. Re-answering an already
 * answered question is not allowed (it would not advance the turn twice).
 */
export async function answerQuestion(
  roomId: string,
  playerId: string,
  input: AnswerQuestionInput,
): Promise<QuestionDTO> {
  const value = typeof input?.value === "string" ? input.value : "";
  if (!isAnswerValue(value)) throw new RoomError(RealtimeError.INVALID_INPUT);

  const round = await requireActiveRound(roomId);
  if (round.masterId !== playerId) throw new RoomError(RealtimeError.FORBIDDEN);

  const question = await prisma.question.findFirst({
    where: { id: asId(input?.questionId), roundId: round.id },
    select: { id: true, playerId: true, answer: { select: { id: true } } },
  });
  if (!question) throw new RoomError(RealtimeError.QUESTION_NOT_FOUND);

  const wasOpen = question.answer === null;

  await prisma.answer.upsert({
    where: { questionId: question.id },
    create: { questionId: question.id, authorId: playerId, value },
    update: { value, authorId: playerId },
  });

  // Answering the OPEN question hands the turn to the next detective.
  if (wasOpen) {
    await advanceTurn(round, question.playerId);
  }

  const updated = await prisma.question.findUnique({
    where: { id: question.id },
    select: QUESTION_SELECT,
  });
  if (!updated) throw new RoomError(RealtimeError.INTERNAL);
  return toQuestionDTO(updated);
}

/**
 * The detective whose turn it is skips without asking, passing it on.
 * Not allowed while a question is still open (that turn is already spent).
 */
export async function passTurn(roomId: string, playerId: string): Promise<void> {
  const round = await requireActiveRound(roomId);
  if (round.currentAskerId !== playerId) throw new RoomError(RealtimeError.NOT_YOUR_TURN);
  if (await hasPendingQuestion(round.id)) throw new RoomError(RealtimeError.NOT_YOUR_TURN);
  await advanceTurn(round, playerId);
}
