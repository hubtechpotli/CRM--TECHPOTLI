# Database Optimization Report

## Migration: `20260610120000_performance_indexes`

```sql
CREATE INDEX IF NOT EXISTS "CustomerWorkItem_status_createdAt_idx"
  ON "CustomerWorkItem"("status", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "CustomerWorkItem_createdAt_idx"
  ON "CustomerWorkItem"("createdAt" DESC);

CREATE INDEX IF NOT EXISTS "CustomerTimelineEvent_customerId_createdAt_idx"
  ON "CustomerTimelineEvent"("customerId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx"
  ON "Notification"("userId", "createdAt" DESC);
```

## Query patterns optimized

| Query | Index used |
|-------|------------|
| Team feed `ORDER BY createdAt DESC` + status filter | `CustomerWorkItem_status_createdAt_idx` |
| Customer timeline cursor | `CustomerTimelineEvent_customerId_createdAt_idx` |
| Notifications list / cursor | `Notification_userId_createdAt_idx` |

## EXPLAIN ANALYZE (recommended on staging)

Run on production-sized data:

```sql
EXPLAIN ANALYZE
SELECT * FROM "CustomerWorkItem"
WHERE "status" = 'OPEN'
ORDER BY "createdAt" DESC
LIMIT 21;

EXPLAIN ANALYZE
SELECT * FROM "CustomerTimelineEvent"
WHERE "customerId" = '<id>'
ORDER BY "createdAt" DESC, "id" DESC
LIMIT 21;
```

## FTS

Existing GIN indexes on `Customer`, `Lead`, `Project` (migration `20260606051223`). Team feed `q` search uses Prisma `contains` (ILIKE); add FTS only if staging shows > 100ms on search.
