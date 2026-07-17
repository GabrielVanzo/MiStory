"use client";

import type {
  Ack,
  CreateRoomInput,
  JoinRoomInput,
  RealtimeErrorCode,
  RoomJoinedPayload,
} from "@/lib/realtime/events";
import { getSocket } from "@/lib/realtime/socket";

/**
 * Every error the server can return, in words a player understands.
 *
 * Typed as a full `Record<RealtimeErrorCode, …>` on purpose: adding a code to
 * the contract without writing a message here is a compile error. Ten codes
 * used to fall through to a generic "Algo deu errado" — including reachable
 * ones like NO_ENIGMAS and GUESS_ALREADY_USED.
 */
const MESSAGES: Record<RealtimeErrorCode, string> = {
  ROOM_NOT_FOUND: "Sala não encontrada. Confira o código.",
  ROOM_FULL: "A sala está cheia.",
  NICKNAME_TAKEN: "Esse apelido já está em uso nesta sala.",
  INVALID_INPUT: "Verifique os dados informados.",
  NOT_IN_ROOM: "Você não está em uma sala.",
  FORBIDDEN: "Você não tem permissão para isso.",
  ROUND_IN_PROGRESS: "Já existe uma rodada em andamento.",
  NO_ACTIVE_ROUND: "Nenhuma rodada em andamento.",
  NO_ENIGMAS: "Nenhum enigma disponível. Rode `npm run db:seed` para carregar o catálogo.",
  NOT_ENOUGH_PLAYERS: "São necessários ao menos 2 jogadores conectados.",
  QUESTION_NOT_FOUND: "Essa pergunta não existe mais.",
  MASTER_CANNOT_ASK: "O mestre conduz a rodada — quem pergunta são os detetives.",
  MASTER_CANNOT_GUESS: "O mestre já conhece a resposta.",
  NOT_YOUR_TURN: "Aguarde a sua vez de perguntar.",
  ELIMINATED: "Seu chute foi recusado — você está fora desta rodada.",
  NO_HINT_AVAILABLE: "Nenhuma dica liberada ainda.",
  GUESS_ALREADY_USED: "Você já usou seu único chute nesta rodada.",
  GUESS_NOT_FOUND: "Esse chute não existe mais.",
  GUESS_ALREADY_RESOLVED: "Esse chute já foi julgado.",
  RATE_LIMITED: "Calma lá! Muitas ações em pouco tempo. Aguarde um instante.",
  INTERNAL: "Algo deu errado. Tente novamente.",
};

/** Client-side failure, not returned by the server. */
const CONNECT_ERROR_MESSAGE = "Não foi possível conectar ao servidor.";

export function realtimeErrorMessage(code: string): string {
  if (code === "CONNECT_ERROR") return CONNECT_ERROR_MESSAGE;
  return MESSAGES[code as RealtimeErrorCode] ?? MESSAGES.INTERNAL;
}

/** Ensure the socket is connected before emitting. */
function ensureConnected(): Promise<void> {
  const socket = getSocket();
  if (socket.connected) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const onConnect = () => {
      socket.off("connect_error", onError);
      resolve();
    };
    const onError = () => {
      socket.off("connect", onConnect);
      reject(new Error("CONNECT_ERROR"));
    };
    socket.once("connect", onConnect);
    socket.once("connect_error", onError);
    socket.connect();
  });
}

export async function createRoom(input: CreateRoomInput): Promise<RoomJoinedPayload> {
  await ensureConnected();
  const res: Ack<RoomJoinedPayload> = await getSocket().emitWithAck("room:create", input);
  if (!res.ok) throw new Error(res.error);
  return res.data;
}

export async function joinRoom(input: JoinRoomInput): Promise<RoomJoinedPayload> {
  await ensureConnected();
  const res: Ack<RoomJoinedPayload> = await getSocket().emitWithAck("room:join", input);
  if (!res.ok) throw new Error(res.error);
  return res.data;
}
