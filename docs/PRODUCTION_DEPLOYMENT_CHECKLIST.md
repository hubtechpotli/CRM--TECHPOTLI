# Production Deployment Checklist — Performance Optimization

Use this checklist when promoting `feature/performance-optimization` to production.

---

## Infrastructure — Singapore co-location (required)

Deploy all backend services in **one Railway region** (Singapore / `asia-southeast1`):

| Service | Platform | Region |
|---------|----------|--------|
| Frontend | Vercel | Singapore (`sin1`) when available |
| API | Railway | Singapore |
| Worker (BullMQ) | Railway | Singapore |
| PostgreSQL | Railway | Singapore |
| Redis | Railway | Singapore |

Steps:

1. Railway project → Settings → Region: **Southeast Asia (Singapore)**
2. Ensure Postgres, Redis, API, and Worker services are in the **same project**
3. Vercel → Project Settings → `API_PROXY_TARGET` = Singapore Railway API URL (no `/api` suffix)
4. Vercel → Functions region: prefer **Singapore** for lowest latency to Railway API

Verify API → DB RTT from Railway shell:

```bash
npx ts-node --transpile-only scripts/bench-db-reads.ts
# Expect DashboardSnapshot p50 < 10ms (not ~300ms cross-region)
```

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
3. `20260610160000_customer_summary_search_index` — `CustomerSummary`, `SearchIndex`

---

## Initial snapshot seed (required)

Dashboard will return **503** until snapshots exist. Run once after deploy:

```bash
cd backend
npx ts-node --transpile-only scripts/refresh-snapshots.ts
```

Or wait up to 5 minutes for the `dashboard-snapshot` BullMQ cron job.

Also seed customer summaries and search index (or wait for cron):

```bash
# Customer summaries — every 5 min via customer-summary-refresh cron
# Search index — nightly via search-index-rebuild cron, or trigger manually from worker
```

Set `ENABLE_REQUEST_TIMING=true` temporarily after deploy to capture per-phase breakdown logs (`JWT`, `Redis`, `Prisma`, `Overhead`).

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

- Watch BullMQ `cron` queue for `dashboard-snapshot`, `customer-summary-refresh`, `search-index-rebuild` failures
- Alert if `GET /reports/dashboard` returns 503 for > 10 minutes
- Prometheus `/api/metrics`: `http_request_duration_seconds`, `auth_jwt_duration_seconds`, `prisma_query_duration_seconds`, `redis_cache_hit_total`
- Grafana dashboard: **TechPotli API Performance** (`grafana/dashboards/api-performance.json`)
- Response headers include `Server-Timing` for bench correlation (`jwt`, `redis`, `prisma`, `overhead`)

---

## Sign-off

| Role | Name | Date | OK |
|------|------|------|-----|
| Engineering | | | ☐ |
| QA | | | ☐ |
| Ops | | | ☐ |
