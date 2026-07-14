import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native / Prisma packages out of the server bundle so the
  // better-sqlite3 native binding is loaded at runtime instead of bundled.
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
};

export default nextConfig;
