import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Relative (not "@/") so the standalone Socket.IO server (run via tsx, which
// does not resolve tsconfig path aliases) can import this module too.
import { PrismaClient } from "./generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  });

  return new PrismaClient({
    adapter,
    // PRISMA_LOG=query surfaces every statement — useful to count queries per
    // action when tuning. Off by default.
    log:
      process.env.PRISMA_LOG === "query"
        ? ["query", "warn", "error"]
        : process.env.NODE_ENV === "development"
          ? ["warn", "error"]
          : ["error"],
  });
}

// Reuse a single client across hot reloads in development to avoid
// exhausting database connections.
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
