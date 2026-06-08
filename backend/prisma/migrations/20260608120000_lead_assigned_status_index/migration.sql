-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_assignedToId_status_idx" ON "Lead"("assignedToId", "status");
