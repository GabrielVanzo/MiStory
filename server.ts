import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";

import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "./lib/realtime/events";
import { registerRealtimeHandlers, resumeRoundTimers, startSweeper } from "./server/realtime";
import { REALTIME_CONFIG } from "./server/realtime/config";
import { markAllPlayersDisconnected } from "./server/realtime/rooms";

/**
 * Hosting platforms (Railway, Render, Fly, Heroku…) inject `PORT` and route
 * traffic to it — honouring it is what makes the service reachable there.
 * `SOCKET_PORT` stays as the local-dev knob.
 */
const PORT = Number(process.env.PORT ?? process.env.SOCKET_PORT ?? 3001);

/**
 * Allowed browser origins, comma-separated. A list rather than a single value
 * because a real deploy has more than one: the platform URL and the custom
 * domain (and they change at different times).
 *   CLIENT_ORIGIN="https://mistory.vercel.app,https://seujogo.com.br"
 */
const ORIGINS = (process.env.CLIENT_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, "")) // a trailing slash never matches
  .filter(Boolean);

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
  httpServer,
  {
    cors: { origin: ORIGINS, methods: ["GET", "POST"] },
  },
);

registerRealtimeHandlers(io);

// Presence from a previous process is stale — no sockets exist yet.
markAllPlayersDisconnected()
  .then((count) => {
    if (count > 0) console.log(`[realtime] reset presence for ${count} player(s)`);
  })
  .catch((error) => console.error("[realtime] presence reset failed:", error));

// Round deadlines must survive a restart — re-arm them (and close overdue ones).
resumeRoundTimers(io).catch((error) =>
  console.error("[realtime] round timer resume failed:", error),
);

startSweeper(io);

httpServer.listen(PORT, () => {
  console.log(`[realtime] Socket.IO listening on :${PORT} (origins: ${ORIGINS.join(", ")})`);
  console.log(
    `[realtime] sweep=${REALTIME_CONFIG.sweepIntervalMs}ms hostGrace=${REALTIME_CONFIG.hostGraceMs}ms playerTtl=${REALTIME_CONFIG.playerTtlMs}ms roomTtl=${REALTIME_CONFIG.roomTtlMs}ms`,
  );
});

// A realtime server is long-lived: an unexpected rejection anywhere must be
// logged and contained, never take every live room down with it.
process.on("unhandledRejection", (reason) => {
  console.error("[realtime] unhandled rejection:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[realtime] uncaught exception:", error);
});

function shutdown(): void {
  io.close();
  httpServer.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
