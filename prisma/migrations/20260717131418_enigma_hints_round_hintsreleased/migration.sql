-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Enigma" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "teaser" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "hints" TEXT NOT NULL DEFAULT '[]',
    "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Enigma" ("createdAt", "difficulty", "explanation", "id", "isPublished", "language", "slug", "solution", "teaser", "title", "updatedAt") SELECT "createdAt", "difficulty", "explanation", "id", "isPublished", "language", "slug", "solution", "teaser", "title", "updatedAt" FROM "Enigma";
DROP TABLE "Enigma";
ALTER TABLE "new_Enigma" RENAME TO "Enigma";
CREATE UNIQUE INDEX "Enigma_slug_key" ON "Enigma"("slug");
CREATE INDEX "Enigma_isPublished_difficulty_idx" ON "Enigma"("isPublished", "difficulty");
CREATE TABLE "new_Round" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "enigmaId" TEXT NOT NULL,
    "masterId" TEXT,
    "solvedById" TEXT,
    "number" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "currentAskerId" TEXT,
    "hintsReleased" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME,
    "expiresAt" DATETIME,
    "pausedRemainingMs" INTEGER,
    "endedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Round_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Round_enigmaId_fkey" FOREIGN KEY ("enigmaId") REFERENCES "Enigma" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Round_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Round_solvedById_fkey" FOREIGN KEY ("solvedById") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Round" ("createdAt", "currentAskerId", "endedAt", "enigmaId", "expiresAt", "id", "masterId", "number", "pausedRemainingMs", "roomId", "solvedById", "startedAt", "status", "updatedAt") SELECT "createdAt", "currentAskerId", "endedAt", "enigmaId", "expiresAt", "id", "masterId", "number", "pausedRemainingMs", "roomId", "solvedById", "startedAt", "status", "updatedAt" FROM "Round";
DROP TABLE "Round";
ALTER TABLE "new_Round" RENAME TO "Round";
CREATE INDEX "Round_roomId_status_idx" ON "Round"("roomId", "status");
CREATE INDEX "Round_enigmaId_idx" ON "Round"("enigmaId");
CREATE UNIQUE INDEX "Round_roomId_number_key" ON "Round"("roomId", "number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
