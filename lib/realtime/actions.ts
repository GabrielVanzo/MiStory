"use client";

import type { Ack, CreateRoomInput, JoinRoomInput, RoomJoinedPayload } from "@/lib/realtime/events";
import { getSocket } from "@/lib/realtime/socket";

const MESSAGES: Record<string, string> = {
  ROOM_NOT_FOUND: "Sala não encontrada. Confira o código.",
  ROOM_FULL: "A sala está cheia.",
  NICKNAME_TAKEN: "Esse apelido já está em uso nesta sala.",
  WRONG_PASSWORD: "Senha incorreta.",
  INVALID_INPUT: "Verifique os dados informados.",
  NOT_IN_ROOM: "Você não está em uma sala.",
  INTERNAL: "Algo deu errado. Tente novamente.",
  CONNECT_ERROR: "Não foi possível conectar ao servidor.",
};

export function realtimeErrorMessage(code: string): string {
  return MESSAGES[code] ?? MESSAGES.INTERNAL;
}

/** Ensure the socket is connected before emitting. */
export function ensureConnected(): Promise<void> {
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
