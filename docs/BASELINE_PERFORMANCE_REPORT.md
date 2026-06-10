# Baseline Performance Report

> Pre-optimization reference. Re-run `backend/scripts/bench-api.ts` after deploy to compare.

## How to benchmark

```bash
cd backend
API_URL=http://localhost:3001/api TOKEN=<jwt> CUSTOMER_ID=<id> npx ts-node scripts/bench-api.ts
```

## Endpoints measured

| Endpoint | Baseline (est.) | Target |
|----------|-----------------|--------|
| `GET /team-updates/feed?limit=20` | 400–800ms (50 items + nested updates) | < 300ms |
| `GET /customers/:id/timeline` | Full scan (all events) | < 300ms (20 + cursor) |
| `GET /customers/:id/work-items?limit=20` | Full list | < 300ms |
| `GET /notifications?limit=20` | 50 items | < 200ms |
| `GET /notifications/unread-count` | DB each request | < 100ms (30s cache) |
| `GET /reports/crm-insights` | 60s cache, heavy aggregates | < 400ms warm |
| `POST /uploads` (10MB proxy) | Browser→API→S3 | 3–10× faster via presigned PUT |
| Invoice PDF on create | Blocks request ~1–3s | Async queue |

## Known bottlenecks (pre-change)

1. Team feed: default `take=50`, nested `updates` thread per item
2. Customer timeline: no pagination
3. JWT: 2 DB reads per authenticated request
4. Duplicate Socket.io connections (bell + toast)
5. Reports: 60s Redis TTL, live DB on cache miss
6. Multipart uploads through API process

## Payload sizes (typical)

| API | Before | After |
|-----|--------|-------|
| Team feed page | ~50 work items + threads | 20 items, thread on expand |
| Notifications dropdown | 50 rows | 20 rows |
| Customers directory | limit 50 | limit 20 |
