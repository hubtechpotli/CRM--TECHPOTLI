# Production Deployment Checklist — Performance Optimization

Use this checklist when promoting `feature/performance-optimization` to production.

---

## Pre-deploy

- [ ] Review [FINAL_PERFORMANCE_VALIDATION.md](./FINAL_PERFORMANCE_VALIDATION.md)
- [ ] Review [QUERY_ANALYSIS_REPORT.md](./QUERY_ANALYSIS_REPORT.md)
- [ ] Confirm Redis is running (sessions, caches, BullMQ)
- [ ] Confirm worker process is deployed (`APP_MODE=worker` or dedicated worker container)
- [ ] Set `ENABLE_CRON_JOBS=true` on worker (or API if single-process)
- [ ] Set `ENABLE_SESSION_CACHE=true` (default)
- [ ] Backup database before migration

---

## Database migrations

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

Migrations included in this release:

1. `20260610120000_performance_indexes` — list/search indexes
2. `20260610140000_analytics_snapshots` — `DailyRevenueSnapshot`, `MonthlyRevenueSnapshot`, `MrrSnapshot`, `EmployeePerformanceSnapshot`

---

## Initial snapshot seed (required)

Dashboard will return **503** until snapshots exist. Run once after deploy:

```bash
cd backend
npx ts-node --transpile-only scripts/refresh-snapshots.ts
```

Or wait up to 5 minutes for the `dashboard-snapshot` BullMQ cron job.

Verify:

```bash
curl -H "Authorization: Bearer $TOKEN" https://YOUR_API/api/reports/dashboard
# Expect: "source": "snapshot"
```

---

## Environment variables

| Variable | Production value |
|----------|------------------|
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis for cache + BullMQ |
| `ENABLE_CRON_JOBS` | `true` on worker |
| `ENABLE_SESSION_CACHE` | `true` |
| `ENABLE_ASYNC_PDF` | `true` (recommended) |
| `JWT_ACCESS_SECRET` | Strong secret |
| `AWS_*` / S3 | Presigned uploads |

---

## Deploy order

1. **Migrate** database (`prisma migrate deploy`)
2. **Deploy worker** with BullMQ processors (cron + pdf)
3. **Run snapshot refresh** (script or wait for cron)
4. **Deploy API** (rolling restart)
5. **Deploy frontend** (pagination + lazy charts already in bundle)
6. **Smoke test** (see below)

---

## Post-deploy smoke tests

| Test | Command / action | Expected |
|------|------------------|----------|
| Health | `GET /api/health` | 200 |
| Login | Sign in as admin | 200 + token |
| Dashboard | Open `/dashboard` | Loads without 503 |
| Dashboard API | `GET /reports/dashboard` | `source: snapshot` |
| CRM insights | `GET /reports/crm-insights` | `source: snapshot` |
| Customers | List page, pagination 20 | 200 |
| Projects | List page | 200 |
| Team updates | Feed loads | 200 |
| Notifications | Bell + unread count | 200 |
| Attendance | Check-in page | 200 |
| Upload | Presigned PUT flow | File in S3 |
| Invoice PDF | Create invoice | PDF job queued / socket event |
| Customer CRUD | Create + edit customer | 200 |
| Project CRUD | Create + edit project | 200 |

---

## Benchmark regression (optional)

```bash
cd backend
TOKEN=$(npx ts-node --transpile-only scripts/bench-token.ts)
API_URL=https://YOUR_API/api ITERATIONS=30 TOKEN=$TOKEN OUTPUT=../docs/bench-prod.json \
  npx ts-node --transpile-only scripts/bench-api.ts
```

Targets (co-located with DB):

- Dashboard / reports P95 < 500 ms
- List endpoints P95 < 400 ms
- Team feed P95 < 300 ms

---

## Rollback plan

1. Revert API/worker images to previous tag
2. **Do not** roll back migrations (snapshot tables are additive)
3. If dashboard 503 persists, run `refresh-snapshots.ts` on current version

---

## Monitoring

- Watch BullMQ `cron` queue for `dashboard-snapshot` failures
- Alert if `GET /reports/dashboard` returns 503 for > 10 minutes
- Prometheus metrics endpoint (if enabled): API latency histograms

---

## Sign-off

| Role | Name | Date | OK |
|------|------|------|-----|
| Engineering | | | ☐ |
| QA | | | ☐ |
| Ops | | | ☐ |
