import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The realtime server (server.ts, run by tsx) is the only process that talks
  // to the database, so Next never bundles Prisma or the better-sqlite3 native
  // binding — no serverExternalPackages needed here.
};

export default nextConfig;
