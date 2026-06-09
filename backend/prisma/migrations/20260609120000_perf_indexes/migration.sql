-- CreateIndex
CREATE INDEX "Lead_updatedAt_idx" ON "Lead"("updatedAt");

-- CreateIndex
CREATE INDEX "Payment_status_paidDate_idx" ON "Payment"("status", "paidDate");
