import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";

import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "./lib/realtime/events";
import { registerRealtimeHandlers } from "./server/realtime";

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

httpServer.listen(PORT, () => {
  console.log(`[realtime] Socket.IO listening on :${PORT} (origin: ${ORIGIN})`);
});

function shutdown(): void {
  io.close();
  httpServer.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
