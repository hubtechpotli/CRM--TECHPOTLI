/** React Query stale times aligned with backend Redis TTLs (see docs/CACHE_STRATEGY.md). */

/** reports:crm-insights, reports:dashboard, MRR, employee-performance — 300s */
export const REPORTS_STALE_MS = 300_000;

/** customers-directory namespace — 120s */
export const CUSTOMERS_DIRECTORY_STALE_MS = 120_000;

/** team-updates:feed — 120s */
export const TEAM_FEED_STALE_MS = 120_000;

/** Standard list pages (invoices, payments, leads list) — 30s */
export const LIST_STALE_MS = 30_000;

/** Global / typeahead search — 60s */
export const SEARCH_STALE_MS = 60_000;
