-- Customer summary read model and denormalized search index

CREATE TABLE IF NOT EXISTS "CustomerSummary" (
    "customerId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "projectCount" INTEGER NOT NULL DEFAULT 0,
    "invoiceCount" INTEGER NOT NULL DEFAULT 0,
    "pendingAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3),
    "renewalCount" INTEGER NOT NULL DEFAULT 0,
    "openTasks" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomerSummary_pkey" PRIMARY KEY ("customerId")
);

ALTER TABLE "CustomerSummary"
  ADD CONSTRAINT "CustomerSummary_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "CustomerSummary_updatedAt_idx" ON "CustomerSummary"("updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "CustomerSummary_lastActivityAt_idx" ON "CustomerSummary"("lastActivityAt" DESC);

CREATE TABLE IF NOT EXISTS "SearchIndex" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "searchText" TEXT NOT NULL,
    "assignedToId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SearchIndex_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SearchIndex_entityType_entityId_key" ON "SearchIndex"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "SearchIndex_entityType_idx" ON "SearchIndex"("entityType");
CREATE INDEX IF NOT EXISTS "SearchIndex_assignedToId_idx" ON "SearchIndex"("assignedToId");

CREATE INDEX IF NOT EXISTS "SearchIndex_fts_idx" ON "SearchIndex" USING GIN (
  to_tsvector('english', coalesce("title", '') || ' ' || coalesce("subtitle", '') || ' ' || coalesce("searchText", ''))
);
