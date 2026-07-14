-- AlterTable
ALTER TABLE "Player" ADD COLUMN "sessionToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Player_sessionToken_key" ON "Player"("sessionToken");

