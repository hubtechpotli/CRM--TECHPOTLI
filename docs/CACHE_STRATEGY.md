# Cache Strategy

## TTL summary

| Cache key / namespace | TTL | Invalidate |
|----------------------|-----|------------|
| `team-updates:feed:*` | 120s | `bumpNamespace('team-updates')` on work-item CRUD |
| `session:ctx:{sid}` | Session lifetime | Revoke / password change |
| `notifications:unread:{userId}` | 30s | `bumpNamespace('notifications-unread:{userId}')` |
| `reports:crm-insights:*` | 300s | `bumpNamespace('crm-insights')` |
| `reports:employee-performance:*` | 300s | `bumpNamespace('employee-performance')` |
| `reports:mrr:*` | 300s | `bumpNamespace('mrr')` |
| `reports:profit-loss:*` | 300s | `bumpNamespace('profit-loss')` |
| `reports:team-work:*` | 300s | `bumpNamespace('team-work')` |
| `reports:dashboard` | 300s | Dashboard snapshot cron (5 min) |
| `DashboardSnapshot` (DB) | 5 min | `dashboard-snapshot` cron job |
| `customers-directory` | 120–300s | Customer CRUD |
| `projects:kanban` | 30s | Project mutations |

## Never cache

- Payment writes / attendance clock-in
- Presigned URL generation (`POST /uploads/presign`)
- Auth token issuance / 2FA verification

## Rollback flags

- `ENABLE_SESSION_CACHE=false`
- `ENABLE_TEAM_FEED_CACHE=false`
- `ENABLE_ASYNC_PDF=false` (sync PDF path)
