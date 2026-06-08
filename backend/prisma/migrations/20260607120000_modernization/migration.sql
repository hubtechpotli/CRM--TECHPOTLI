-- AI lead scoring fields
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "aiScore" INTEGER;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "aiScoreReason" TEXT;

-- Support ticket AI tags
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Event deduplication
CREATE TABLE IF NOT EXISTS "ProcessedEvent" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProcessedEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ProcessedEvent_topic_idx" ON "ProcessedEvent"("topic");

-- AI request audit log
CREATE TABLE IF NOT EXISTS "AiRequestLog" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "latencyMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiRequestLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AiRequestLog_type_createdAt_idx" ON "AiRequestLog"("type", "createdAt" DESC);

-- CQRS dashboard read model
CREATE TABLE IF NOT EXISTS "DashboardSnapshot" (
    "id" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DashboardSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DashboardSnapshot_metricKey_key" ON "DashboardSnapshot"("metricKey");

-- Workflow automation rules
CREATE TABLE IF NOT EXISTS "WorkflowRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkflowRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "WorkflowRule_event_enabled_idx" ON "WorkflowRule"("event", "enabled");

-- pgvector + embeddings (optional — skipped on embedded Postgres without the extension)
DO $migration$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;

  CREATE TABLE IF NOT EXISTS "EmbeddingRecord" (
      "id" TEXT NOT NULL,
      "entityType" TEXT NOT NULL,
      "entityId" TEXT NOT NULL,
      "vector" vector(768),
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "EmbeddingRecord_pkey" PRIMARY KEY ("id")
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "EmbeddingRecord_entityType_entityId_key" ON "EmbeddingRecord"("entityType", "entityId");
  CREATE INDEX IF NOT EXISTS "EmbeddingRecord_entityType_idx" ON "EmbeddingRecord"("entityType");
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pgvector unavailable — semantic search will use keyword FTS only';
    CREATE TABLE IF NOT EXISTS "EmbeddingRecord" (
        "id" TEXT NOT NULL,
        "entityType" TEXT NOT NULL,
        "entityId" TEXT NOT NULL,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "EmbeddingRecord_pkey" PRIMARY KEY ("id")
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "EmbeddingRecord_entityType_entityId_key" ON "EmbeddingRecord"("entityType", "entityId");
    CREATE INDEX IF NOT EXISTS "EmbeddingRecord_entityType_idx" ON "EmbeddingRecord"("entityType");
END $migration$;
