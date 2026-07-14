-- CreateTable
CREATE TABLE "Enigma" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "teaser" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LOBBY',
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "passwordHash" TEXT,
    "maxPlayers" INTEGER NOT NULL DEFAULT 8,
    "currentRoundNumber" INTEGER,
    "settings" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "endedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "color" TEXT,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "isConnected" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME,
    CONSTRAINT "Player_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "enigmaId" TEXT NOT NULL,
    "masterId" TEXT,
    "solvedById" TEXT,
    "number" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Round_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Round_enigmaId_fkey" FOREIGN KEY ("enigmaId") REFERENCES "Enigma" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Round_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Round_solvedById_fkey" FOREIGN KEY ("solvedById") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roundId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Question_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Question_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "authorId" TEXT,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Answer_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "roundId" TEXT,
    "points" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Score_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Score_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Score_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Enigma_slug_key" ON "Enigma"("slug");

-- CreateIndex
CREATE INDEX "Enigma_isPublished_difficulty_idx" ON "Enigma"("isPublished", "difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "Room_code_key" ON "Room"("code");

-- CreateIndex
CREATE INDEX "Room_status_idx" ON "Room"("status");

-- CreateIndex
CREATE INDEX "Player_roomId_idx" ON "Player"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_roomId_nickname_key" ON "Player"("roomId", "nickname");

-- CreateIndex
CREATE INDEX "Round_roomId_status_idx" ON "Round"("roomId", "status");

-- CreateIndex
CREATE INDEX "Round_enigmaId_idx" ON "Round"("enigmaId");

-- CreateIndex
CREATE UNIQUE INDEX "Round_roomId_number_key" ON "Round"("roomId", "number");

-- CreateIndex
CREATE INDEX "Question_roundId_createdAt_idx" ON "Question"("roundId", "createdAt");

-- CreateIndex
CREATE INDEX "Question_playerId_idx" ON "Question"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_questionId_key" ON "Answer"("questionId");

-- CreateIndex
CREATE INDEX "Answer_authorId_idx" ON "Answer"("authorId");

-- CreateIndex
CREATE INDEX "Score_roomId_playerId_idx" ON "Score"("roomId", "playerId");

-- CreateIndex
CREATE INDEX "Score_roundId_idx" ON "Score"("roundId");
