-- Performance indexes for paginated feeds and timelines

CREATE INDEX IF NOT EXISTS "CustomerWorkItem_status_createdAt_idx"
  ON "CustomerWorkItem"("status", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "CustomerWorkItem_createdAt_idx"
  ON "CustomerWorkItem"("createdAt" DESC);

CREATE INDEX IF NOT EXISTS "CustomerTimelineEvent_customerId_createdAt_idx"
  ON "CustomerTimelineEvent"("customerId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx"
  ON "Notification"("userId", "createdAt" DESC);
