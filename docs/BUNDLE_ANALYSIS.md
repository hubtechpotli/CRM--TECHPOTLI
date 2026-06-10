# Frontend Bundle Analysis

## Optimizations applied

1. **Lazy dashboard charts** — `LeadsOverviewChart`, `LeadSourceChart`, `RecentLeadsPanel`, `ActivitySidebar`, `TopSalespeople` loaded via `next/dynamic` (ssr: false).
2. **Kanban boards** — Leads and Projects kanban already dynamic-imported.
3. **TanStack Virtual** — `PremiumDataTable` virtualizes rows when count > 20.
4. **Single Socket.io** — `SocketProvider` in `Providers`; bell and toast share one connection.

## Recommended analysis command

```bash
cd frontend
ANALYZE=true npm run build
# or
npx @next/bundle-analyzer
```

## Heavy dependencies (watch list)

- `framer-motion` — dashboard animations, toasts
- `recharts` — chart components (now lazy)
- `socket.io-client` — single instance via provider
- `exceljs` — only on export flows (if used client-side)

## Pagination impact

Default page size 20 across list pages reduces initial JSON parse and React render cost vs 50–100 row pages.
