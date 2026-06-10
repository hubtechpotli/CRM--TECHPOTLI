# Production Validation Report

> Branch: `feature/performance-optimization` · Validated: 2026-06-10

## Build verification

| Package | Command | Result |
|---------|---------|--------|
| Backend | `npm run build` | Pass |
| Frontend | `npm run build` | Pass |

## Smoke checklist

| Area | Check | Status |
|------|-------|--------|
| Team Updates | Page 1 shows 20 newest; search/filter; pagination footer | Implemented |
| Customer timeline | 20 items + Load more (cursor) | Implemented |
| Customer work items | Cursor pagination + Load more | Implemented |
| Upload | Presigned PUT when S3 configured; multipart fallback locally | Implemented |
| Invoice PDF | Queued when `ENABLE_ASYNC_PDF` true; `GET /invoices/:id/pdf-status` | Implemented |
| Auth | Session context cache behind `ENABLE_SESSION_CACHE` | Implemented |
| Notifications | Bell unread count (30s cache); dropdown/page 20 items | Implemented |
| Socket | Single `SocketProvider` connection | Implemented |
| Reports | crm-insights + reports cached 5 min; dashboard snapshot cron | Implemented |
| List pages | Default limit 20 (customers, leads, payments, projects, invoices, renewals) | Implemented |
| nginx | gzip for JSON/JS/CSS | Implemented |
| DB indexes | Timeline, notifications, work-item cursor indexes | Migration added |

## Rollback

Each feature has an env flag (see `CACHE_STRATEGY.md`). Revert branch `feature/performance-optimization` if needed.

| Flag | Disable behavior |
|------|------------------|
| `ENABLE_SESSION_CACHE=false` | Full JWT DB reads |
| `ENABLE_PRESIGNED_UPLOAD=false` | Multipart POST only |
| `ENABLE_ASYNC_PDF=false` | Sync PDF on create |
| `ENABLE_TEAM_FEED_CACHE=false` | Live team feed queries |

## Post-deploy benchmark

```bash
cd backend
API_URL=https://<host>/api TOKEN=<jwt> CUSTOMER_ID=<id> npx ts-node scripts/bench-api.ts
```

Compare results with `BASELINE_PERFORMANCE_REPORT.md` and `PERFORMANCE_IMPROVEMENT_REPORT.md`.
