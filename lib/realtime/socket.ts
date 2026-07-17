"use client";

import { io, type Socket } from "socket.io-client";

import type { ClientToServerEvents, ServerToClientEvents } from "@/lib/realtime/events";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

/** Public URL of the deployed realtime server (Fly). Used when nothing else says otherwise. */
const PRODUCTION_SOCKET_URL = "https://black-stories-realtime.fly.dev";

/**
 * Where the browser reaches the Socket.IO server.
 * 1. `NEXT_PUBLIC_SOCKET_URL` always wins — set it to point anywhere.
 * 2. Otherwise infer: localhost in the browser -> the local dev server;
 *    any other host is a real deployment -> the production server.
 * This keeps the app working on Vercel even if the env var was never set.
 */
function resolveSocketUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (configured) return configured;

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return "http://localhost:3001";
  }
  return PRODUCTION_SOCKET_URL;
}

/** Lazily-created singleton socket. Reconnection is handled by Socket.IO. */
export function getSocket(): AppSocket {
  if (!socket) {
    const url = resolveSocketUrl();
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
