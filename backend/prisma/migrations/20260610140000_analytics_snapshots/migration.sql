-- Analytics snapshot tables for pre-aggregated reporting

CREATE TABLE IF NOT EXISTS "DailyRevenueSnapshot" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "revenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paymentCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyRevenueSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailyRevenueSnapshot_date_key" ON "DailyRevenueSnapshot"("date");
CREATE INDEX IF NOT EXISTS "DailyRevenueSnapshot_date_idx" ON "DailyRevenueSnapshot"("date" DESC);

CREATE TABLE IF NOT EXISTS "MonthlyRevenueSnapshot" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "revenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paymentCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MonthlyRevenueSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyRevenueSnapshot_year_month_key" ON "MonthlyRevenueSnapshot"("year", "month");
CREATE INDEX IF NOT EXISTS "MonthlyRevenueSnapshot_year_month_idx" ON "MonthlyRevenueSnapshot"("year" DESC, "month" DESC);

CREATE TABLE IF NOT EXISTS "MrrSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "mrr" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "activeServices" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MrrSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MrrSnapshot_snapshotDate_key" ON "MrrSnapshot"("snapshotDate");

CREATE TABLE IF NOT EXISTS "EmployeePerformanceSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "customers" INTEGER NOT NULL DEFAULT 0,
    "projects" INTEGER NOT NULL DEFAULT 0,
    "convertedLeads" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmployeePerformanceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmployeePerformanceSnapshot_snapshotDate_userId_key" ON "EmployeePerformanceSnapshot"("snapshotDate", "userId");
CREATE INDEX IF NOT EXISTS "EmployeePerformanceSnapshot_userId_idx" ON "EmployeePerformanceSnapshot"("userId");
