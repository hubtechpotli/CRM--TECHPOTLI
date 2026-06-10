# Performance Improvement Report

## Summary

Production-safe optimizations shipped on `feature/performance-optimization`:

- Paginated APIs (20 default, max 100, newest first) for feeds, lists, timeline, work items, notifications
- Redis caching: team feed, session context, notification unread count, reports (5 min)
- Direct S3 presigned uploads with client image compression
- Async invoice PDF via BullMQ `pdf` queue
- Single Socket.io provider
- Dashboard snapshot cron (5 min) + extended `DashboardSnapshot` JSON
- nginx gzip for JSON/JS/CSS
- DB indexes for cursor pagination hot paths
- TanStack Virtual in `PremiumDataTable` for large in-page lists

## Expected metrics

| Metric | Before | After (target) |
|--------|--------|----------------|
| Team Updates load | 50 items + threads | 20 items, < 300ms |
| Team Updates payload | Large nested JSON | Light list; thread on expand |
| Customer timeline | All events | 20 + cursor |
| Customers default page | 50 rows | 20 rows, newest first |
| Payments default page | 100 rows | 20 rows |
| Upload 10MB | API proxy | Direct S3 PUT |
| Invoice create API | Blocks on PDF | Returns immediately (async) |
| Auth DB reads | 2/request | ~0.2/request (cache hit) |
| Socket connections | 2 per user | 1 |
| crm-insights cache | 60s | 300s |

## Verification

Run bench script before/after on staging with representative data volume. Fill measured columns after deploy.
