"use client";

import { io, type Socket } from "socket.io-client";

import type { ClientToServerEvents, ServerToClientEvents } from "@/lib/realtime/events";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

/** Lazily-created singleton socket. Reconnection is handled by Socket.IO. */
export function getSocket(): AppSocket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";
    socket = io(url, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
    });
  }
  return socket;
}
