-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "CustomerWorkItemStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CustomerWorkItemCategory" AS ENUM ('GENERAL', 'DOMAIN', 'HOSTING', 'PROJECT', 'PAYMENT', 'DOCUMENT', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'PROJECT_UPDATE';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'PROJECT_STATUS_CHANGED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'WORK_ITEM_CREATED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'WORK_ITEM_UPDATED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'WORK_ITEM_COMPLETED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'NOTE_ADDED';

-- CreateTable
CREATE TABLE IF NOT EXISTS "CustomerWorkItem" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "CustomerWorkItemCategory" NOT NULL DEFAULT 'GENERAL',
    "status" "CustomerWorkItemStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerWorkItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CustomerWorkItemUpdate" (
    "id" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "fromStatus" "CustomerWorkItemStatus",
    "toStatus" "CustomerWorkItemStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerWorkItemUpdate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CustomerWorkItem_customerId_createdAt_idx" ON "CustomerWorkItem"("customerId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "CustomerWorkItem_assignedToId_status_idx" ON "CustomerWorkItem"("assignedToId", "status");
CREATE INDEX IF NOT EXISTS "CustomerWorkItem_status_idx" ON "CustomerWorkItem"("status");
CREATE INDEX IF NOT EXISTS "CustomerWorkItemUpdate_workItemId_createdAt_idx" ON "CustomerWorkItemUpdate"("workItemId", "createdAt" ASC);

DO $$ BEGIN
  ALTER TABLE "CustomerWorkItem" ADD CONSTRAINT "CustomerWorkItem_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CustomerWorkItem" ADD CONSTRAINT "CustomerWorkItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CustomerWorkItem" ADD CONSTRAINT "CustomerWorkItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CustomerWorkItem" ADD CONSTRAINT "CustomerWorkItem_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CustomerWorkItemUpdate" ADD CONSTRAINT "CustomerWorkItemUpdate_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "CustomerWorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CustomerWorkItemUpdate" ADD CONSTRAINT "CustomerWorkItemUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
