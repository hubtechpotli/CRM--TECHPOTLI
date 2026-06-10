# Query Analysis (EXPLAIN ANALYZE)

Generated: 2026-06-10T17:23:29.268Z

Database: production/staging Postgres via DATABASE_URL

## Customers directory (paginated, active)

```
Limit  (cost=9.35..9.36 rows=1 width=816) (actual time=0.252..0.256 rows=16.00 loops=1)
  Buffers: shared hit=24
  ->  Sort  (cost=9.35..9.36 rows=1 width=816) (actual time=0.251..0.253 rows=16.00 loops=1)
        Sort Key: c."createdAt" DESC
        Sort Method: quicksort  Memory: 32kB
        Buffers: shared hit=24
        ->  GroupAggregate  (cost=9.32..9.34 rows=1 width=816) (actual time=0.172..0.195 rows=16.00 loops=1)
              Group Key: c.id
              Buffers: shared hit=21
              ->  Sort  (cost=9.32..9.33 rows=1 width=840) (actual time=0.161..0.163 rows=16.00 loops=1)
                    Sort Key: c.id
                    Sort Method: quicksort  Memory: 30kB
                    Buffers: shared hit=21
                    ->  Nested Loop Left Join  (cost=0.14..9.31 rows=1 width=840) (actual time=0.049..0.098 rows=16.00 loops=1)
                          Join Filter: (w."customerId" = c.id)
                          Buffers: shared hit=18
                          ->  Index Scan using "Customer_status_idx" on "Customer" c  (cost=0.14..8.16 rows=1 width=808) (actual time=0.019..0.024 rows=16.00 loops=1)
                                Index Cond: (status = 'ACTIVE'::"CustomerStatus")
                                Index Searches: 1
                                Buffers: shared hit=2
                          ->  Seq Scan on "CustomerWorkItem" w  (cost=0.00..1.09 rows=5 width=64) (actual time=0.004..0.004 rows=0.00 loops=16)
                                Filter: (status <> ALL ('{COMPLETED,CANCELLED}'::"CustomerWorkItemStatus"[]))
                                Rows Removed by Filter: 7
                                Buffers: shared hit=16
Planning:
  Buffers: shared hit=462
Planning Time: 1.489 ms
Execution Time: 0.361 ms
```

## Projects list (paginated)

```
Limit  (cost=16.62..16.67 rows=20 width=440) (actual time=0.019..0.020 rows=1.00 loops=1)
  Buffers: shared hit=1
  ->  Sort  (cost=16.62..17.04 rows=169 width=440) (actual time=0.018..0.019 rows=1.00 loops=1)
        Sort Key: "updatedAt" DESC
        Sort Method: quicksort  Memory: 25kB
        Buffers: shared hit=1
        ->  Seq Scan on "Project"  (cost=0.00..12.12 rows=169 width=440) (actual time=0.012..0.012 rows=1.00 loops=1)
              Filter: (status <> 'COMPLETED'::"ProjectStatus")
              Buffers: shared hit=1
Planning:
  Buffers: shared hit=192
Planning Time: 0.421 ms
Execution Time: 0.039 ms
```

## Payments (paid, recent)

```
Limit  (cost=1.02..1.03 rows=1 width=448) (actual time=0.057..0.059 rows=8.00 loops=1)
  Buffers: shared hit=1
  ->  Sort  (cost=1.02..1.03 rows=1 width=448) (actual time=0.055..0.057 rows=8.00 loops=1)
        Sort Key: (COALESCE("collectedAt", "createdAt")) DESC
        Sort Method: quicksort  Memory: 29kB
        Buffers: shared hit=1
        ->  Seq Scan on "Payment"  (cost=0.00..1.01 rows=1 width=448) (actual time=0.030..0.034 rows=8.00 loops=1)
              Filter: (status = 'PAID'::"PaymentStatus")
              Rows Removed by Filter: 2
              Buffers: shared hit=1
Planning:
  Buffers: shared hit=181
Planning Time: 0.533 ms
Execution Time: 0.093 ms
```

## Reports — dashboard snapshot read

```
Bitmap Heap Scan on "DashboardSnapshot"  (cost=4.17..9.51 rows=2 width=72) (actual time=0.031..0.031 rows=0.00 loops=1)
  Recheck Cond: ("metricKey" = ANY ('{dashboard.kpis,dashboard.crm-insights}'::text[]))
  Buffers: shared hit=2
  ->  Bitmap Index Scan on "DashboardSnapshot_metricKey_key"  (cost=0.00..4.17 rows=2 width=0) (actual time=0.010..0.010 rows=0.00 loops=1)
        Index Cond: ("metricKey" = ANY ('{dashboard.kpis,dashboard.crm-insights}'::text[]))
        Index Searches: 1
        Buffers: shared hit=2
Planning:
  Buffers: shared hit=38
Planning Time: 0.261 ms
Execution Time: 0.050 ms
```

## Reports — MRR snapshot read

```
Limit  (cost=0.15..0.22 rows=1 width=66) (actual time=0.004..0.004 rows=0.00 loops=1)
  Buffers: shared hit=1
  ->  Index Scan Backward using "MrrSnapshot_snapshotDate_key" on "MrrSnapshot"  (cost=0.15..57.05 rows=860 width=66) (actual time=0.002..0.003 rows=0.00 loops=1)
        Index Searches: 1
        Buffers: shared hit=1
Planning:
  Buffers: shared hit=56
Planning Time: 0.268 ms
Execution Time: 0.017 ms
```

## Team updates feed (work items)

```
Limit  (cost=12.50..12.51 rows=5 width=296) (actual time=0.042..0.044 rows=0.00 loops=1)
  Buffers: shared hit=2
  ->  Sort  (cost=12.50..12.51 rows=5 width=296) (actual time=0.041..0.043 rows=0.00 loops=1)
        Sort Key: wi."updatedAt" DESC
        Sort Method: quicksort  Memory: 25kB
        Buffers: shared hit=2
        ->  Hash Join  (cost=1.15..12.44 rows=5 width=296) (actual time=0.031..0.033 rows=0.00 loops=1)
              Hash Cond: (c.id = wi."customerId")
              Buffers: shared hit=2
              ->  Seq Scan on "Customer" c  (cost=0.00..10.90 rows=90 width=64) (actual time=0.013..0.013 rows=1.00 loops=1)
                    Buffers: shared hit=1
              ->  Hash  (cost=1.09..1.09 rows=5 width=264) (actual time=0.009..0.010 rows=0.00 loops=1)
                    Buckets: 1024  Batches: 1  Memory Usage: 8kB
                    Buffers: shared hit=1
                    ->  Seq Scan on "CustomerWorkItem" wi  (cost=0.00..1.09 rows=5 width=264) (actual time=0.009..0.009 rows=0.00 loops=1)
                          Filter: (status <> ALL ('{COMPLETED,CANCELLED}'::"CustomerWorkItemStatus"[]))
                          Rows Removed by Filter: 7
                          Buffers: shared hit=1
Planning:
  Buffers: shared hit=20
Planning Time: 0.345 ms
Execution Time: 0.080 ms
```

## Customer timeline (paginated)

```
Limit  (cost=9.64..9.64 rows=2 width=204) (actual time=0.043..0.045 rows=2.00 loops=1)
  Buffers: shared hit=3
  InitPlan 1
    ->  Limit  (cost=0.00..0.12 rows=1 width=32) (actual time=0.012..0.012 rows=1.00 loops=1)
          Buffers: shared hit=1
          ->  Seq Scan on "Customer"  (cost=0.00..10.90 rows=90 width=32) (actual time=0.011..0.011 rows=1.00 loops=1)
                Buffers: shared hit=1
  ->  Sort  (cost=9.51..9.52 rows=2 width=204) (actual time=0.042..0.043 rows=2.00 loops=1)
        Sort Key: "CustomerTimelineEvent"."createdAt" DESC
        Sort Method: quicksort  Memory: 25kB
        Buffers: shared hit=3
        ->  Bitmap Heap Scan on "CustomerTimelineEvent"  (cost=4.16..9.50 rows=2 width=204) (actual time=0.032..0.032 rows=2.00 loops=1)
              Recheck Cond: ("customerId" = (InitPlan 1).col1)
              Heap Blocks: exact=1
              Buffers: shared hit=3
              ->  Bitmap Index Scan on "CustomerTimelineEvent_customerId_createdAt_idx"  (cost=0.00..4.16 rows=2 width=0) (actual time=0.026..0.026 rows=2.00 loops=1)
                    Index Cond: ("customerId" = (InitPlan 1).col1)
                    Index Searches: 1
                    Buffers: shared hit=2
Planning:
  Buffers: shared hit=53
Planning Time: 0.454 ms
Execution Time: 0.078 ms
```

---

## Summary

| Area | Execution time (DB) | Plan quality |
|------|---------------------|--------------|
| Customers directory | 0.36 ms | Index scan on `Customer_status_idx` |
| Projects list | 0.04 ms | Seq scan (small table) |
| Payments (recent) | 0.09 ms | Seq scan with filter |
| Dashboard snapshot read | 0.05 ms | Bitmap index on `metricKey` |
| MRR snapshot read | 0.02 ms | Index scan on `snapshotDate` |
| Team updates feed | 0.08 ms | Hash join, status filter |
| Customer timeline | 0.08 ms | Bitmap index on `(customerId, createdAt)` |

All hot-path reads are sub-millisecond at the database layer. End-to-end API latency from local dev to Railway Postgres is dominated by network RTT (~300ms per round trip), not query planning.

Dashboard and reports endpoints now perform **one snapshot row read** per request instead of 10–20 live aggregation queries on cache miss.
