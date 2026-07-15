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
    "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Enigma" ("createdAt", "difficulty", "id", "isPublished", "language", "slug", "solution", "teaser", "title", "updatedAt") SELECT "createdAt", "difficulty", "id", "isPublished", "language", "slug", "solution", "teaser", "title", "updatedAt" FROM "Enigma";
DROP TABLE "Enigma";
ALTER TABLE "new_Enigma" RENAME TO "Enigma";
CREATE UNIQUE INDEX "Enigma_slug_key" ON "Enigma"("slug");
CREATE INDEX "Enigma_isPublished_difficulty_idx" ON "Enigma"("isPublished", "difficulty");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

