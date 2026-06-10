-- AlterEnum
ALTER TYPE "TimelineEventType" ADD VALUE 'EMAIL_SENT';

-- AlterTable
ALTER TABLE "EmbeddingRecord" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "collectedAt" TIMESTAMP(3),
ADD COLUMN     "proofFilename" TEXT,
ADD COLUMN     "proofMimeType" TEXT,
ADD COLUMN     "proofS3Key" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedById" TEXT;

-- CreateTable
CREATE TABLE "UserNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Untitled',
    "body" TEXT NOT NULL DEFAULT '',
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserNote_userId_updatedAt_idx" ON "UserNote"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "Payment_createdById_collectedAt_idx" ON "Payment"("createdById", "collectedAt" DESC);

-- CreateIndex
CREATE INDEX "Payment_collectedAt_idx" ON "Payment"("collectedAt" DESC);

-- CreateIndex
CREATE INDEX "Payment_createdById_status_idx" ON "Payment"("createdById", "status");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNote" ADD CONSTRAINT "UserNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
