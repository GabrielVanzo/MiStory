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

const PORT = Number(process.env.SOCKET_PORT ?? 3001);
const ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";

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
    cors: { origin: ORIGIN, methods: ["GET", "POST"] },
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
  console.log(`[realtime] Socket.IO listening on :${PORT} (origin: ${ORIGIN})`);
  console.log(
    `[realtime] sweep=${REALTIME_CONFIG.sweepIntervalMs}ms hostGrace=${REALTIME_CONFIG.hostGraceMs}ms playerTtl=${REALTIME_CONFIG.playerTtlMs}ms roomTtl=${REALTIME_CONFIG.roomTtlMs}ms`,
  );
});

function shutdown(): void {
  io.close();
  httpServer.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
