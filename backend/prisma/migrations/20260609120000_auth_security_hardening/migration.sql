-- AlterTable
ALTER TABLE "User" ADD COLUMN "allowRemoteAccess" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UserSession" ADD COLUMN "refreshTokenLookup" TEXT;

-- Backfill lookup for existing sessions (invalidate old refresh tokens)
UPDATE "UserSession" SET "refreshTokenLookup" = "id" WHERE "refreshTokenLookup" IS NULL;

ALTER TABLE "UserSession" ALTER COLUMN "refreshTokenLookup" SET NOT NULL;
CREATE UNIQUE INDEX "UserSession_refreshTokenLookup_key" ON "UserSession"("refreshTokenLookup");
