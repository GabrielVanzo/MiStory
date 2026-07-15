# Realtime server only (server.ts).
#
# The Next app is NOT built here — it is deployed separately (e.g. Vercel).
# This image exists because a WebSocket server needs a process that stays up,
# which serverless platforms cannot provide.

FROM node:24-slim AS base

# better-sqlite3 is a native module: it is compiled from source during install,
# so the image needs a toolchain. Building inside the image also guarantees the
# binary matches THIS Node version (the ABI mismatch that bites locally).
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
# `npm ci` runs the postinstall (prisma generate), which needs prisma/ present.
RUN npm ci

COPY . .

# The database lives on a mounted volume so it survives deploys and restarts.
ENV DATABASE_URL="file:/data/prod.db"
ENV NODE_ENV=production
# The platform injects PORT and routes to it; 3001 is only the local fallback.
EXPOSE 3001

# Apply migrations and load the enigma catalogue before accepting connections.
# Both are idempotent, so a restart is harmless.
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && npx tsx server.ts"]
