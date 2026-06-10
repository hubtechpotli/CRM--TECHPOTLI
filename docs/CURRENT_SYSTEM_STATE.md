# Current System State — TechPotli CRM

> Snapshot for `feature/performance-optimization` branch. Production baseline before perf work.

## Architecture

| Layer | Stack |
|-------|-------|
| API | NestJS 10, Prisma, PostgreSQL (+ pgvector) |
| Frontend | Next.js 15, React Query, Zustand |
| Cache / sessions | Redis (`CacheService`, `SessionService`) |
| Jobs | BullMQ (`cron` queue, 6 scheduled jobs) |
| Events | Kafka/Redpanda (optional; **disabled in prod compose**) |
| Realtime | Socket.io (`notification`, `work_item:new`, `work_order:new`) |
| Storage | AWS S3 or local `uploads/` fallback |

## Feature flags (env)

| Flag | Purpose |
|------|---------|
| `ENABLE_KAFKA` | Event bus (prod: false) |
| `ENABLE_CRON_JOBS` | BullMQ scheduler |
| `APP_MODE` | `api` \| `worker` |
| `ENABLE_SESSION_CACHE` | JWT validation context cache (new) |
| `ENABLE_PRESIGNED_UPLOAD` | Browser → S3 direct upload (new) |
| `ENABLE_ASYNC_PDF` | BullMQ invoice PDF generation (new) |
| `ENABLE_TEAM_FEED_CACHE` | Redis cache for team-updates feed (new) |
| `DEFAULT_LIST_LIMIT` | Default pagination (20) |

## Redis usage

- Session allowlist: `session:{sid}`, activity debounce `session:active:{sid}`
- `CacheService.wrap` — reports, leads, customers directory, search
- BullMQ connection via `REDIS_URL`
- Namespace versioning: `crm-insights`, `team-updates`, `employee-performance`, `mrr`, `profit-loss`, `team-work`, `notifications-unread:{userId}`

## BullMQ queues

**`cron` queue:** renewal-check, payment-overdue-check, lead-followup-reminder, eod-lead-update-reminder, work-order-escalation, quotation-expiry-check, **dashboard-snapshot** (every 5 min)

**`pdf` queue:** `generate-invoice-pdf` (async invoice PDF when `ENABLE_ASYNC_PDF` ≠ false)

## Socket.io events

| Event | Emitter | Consumers |
|-------|---------|-----------|
| `notification` | NotificationsGateway | NotificationBell (via SocketProvider) |
| `work_item:new` | CustomersGateway | NotificationBell, TeamUpdateToast (single socket) |
| `work_order:new` | — | NotificationBell |
| `invoice:pdf_ready` | NotificationsGateway | Invoice detail (poll/socket) |

## Post-optimization hot paths

- JWT: session context cache (`session:ctx:{sid}`) when `ENABLE_SESSION_CACHE` enabled
- Dashboard: `DashboardSnapshot` + 5 min report Redis TTL
- Team Updates: 20/page, cursor, 120s feed cache, updates on expand
- Uploads: presigned PUT when S3 configured; multipart fallback locally
- Customer timeline / work items: 20 + cursor, load more
