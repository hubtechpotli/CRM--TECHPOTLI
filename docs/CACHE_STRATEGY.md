# Cache Strategy

## TTL summary

| Cache key / namespace | TTL | Invalidate |
|----------------------|-----|------------|
| `team-updates:feed:*` | 120s | `bumpNamespace('team-updates')` on work-item CRUD |
| `session:ctx:{sid}` | 14 min | Session revoke / password change |
| `notifications:unread:{userId}` | 30s | `bumpNamespace('notifications-unread:{userId}')` |
| `reports:profit-loss:*` | 300s | `bumpNamespace('profit-loss')` |
| `reports:team-work:*` | 300s | `bumpNamespace('team-work')` |
| `DashboardSnapshot` (DB) | 5 min refresh | `dashboard-snapshot` cron job |
| `MrrSnapshot` / `EmployeePerformanceSnapshot` (DB) | 5 min refresh | Snapshot cron (no Redis HTTP wrap) |
| `customers-directory` | 120s with `q` / 180s without | Customer CRUD → `bumpNamespace('customers-directory')` |
| `projects:kanban` | 30s | Project mutations |
| `leads:kanban` | 30s | Lead mutations |
| Global search (`search:*`) | 120s | Search index rebuild / entity updates |

### Snapshot reads (DB, not Redis HTTP cache)

CRM insights, dashboard KPIs, MRR, and employee-performance endpoints read precomputed **snapshot tables** (`DashboardSnapshot`, `MrrSnapshot`, `EmployeePerformanceSnapshot`). Namespace bumps for `crm-insights` / `mrr` / `employee-performance` invalidate related keys if Redis layers are added later; current hot path is DB snapshot only.

## Customer directory search

- Terms **≤4 characters**: ILIKE `contains` on name, phone, email (partial match, e.g. `edu` → Education Hub).
- Terms **>4 characters**: try `SearchIndex` FTS first, fall back to ILIKE if empty.
- **Empty search results are not cached** — avoids poisoning shared Redis for other users.

## Never cache

- Payment writes / attendance clock-in
- Presigned URL generation (`POST /uploads/presign`)
- Auth token issuance / 2FA verification

## Rollback flags

- `ENABLE_SESSION_CACHE=false`
- `ENABLE_TEAM_FEED_CACHE=false`
- `ENABLE_ASYNC_PDF=false` (sync PDF path)

## Frontend React Query alignment

See `frontend/lib/query-stale.ts`:

| Constant | Value | Backend alignment |
|----------|-------|-------------------|
| `REPORTS_STALE_MS` | 300s | Snapshot cron + report Redis |
| `CUSTOMERS_DIRECTORY_STALE_MS` | 120s | Directory Redis with `q` |
| `TEAM_FEED_STALE_MS` | 120s | Team feed Redis |
| `LIST_STALE_MS` | 30s | Kanban Redis (30s) + list pages |
| `SEARCH_STALE_MS` | 120s | Global search Redis |
