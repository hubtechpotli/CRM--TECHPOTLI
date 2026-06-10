/**
 * Measure DB-only read latency (isolates network from app stack).
 * Usage: npx ts-node --transpile-only scripts/bench-db-reads.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const runs = 50;

function stats(times: number[]) {
  const sorted = [...times].sort((a, b) => a - b);
  const p = (pct: number) => sorted[Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1)] ?? 0;
  return {
    p50: Math.round(p(50)),
    p95: Math.round(p(95)),
    p99: Math.round(p(99)),
    avg: Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length),
  };
}

async function measure(label: string, fn: () => Promise<unknown>) {
  const times: number[] = [];
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    await fn();
    times.push(performance.now() - t0);
  }
  const s = stats(times);
  console.log(`${label.padEnd(40)} p50=${s.p50}ms p95=${s.p95}ms p99=${s.p99}ms avg=${s.avg}ms`);
}

async function main() {
  console.log(`DB read benchmark (${runs} iterations, Railway Postgres)\n`);
  await measure('DashboardSnapshot (kpis)', () =>
    prisma.dashboardSnapshot.findUnique({ where: { metricKey: 'dashboard.kpis' } }),
  );
  await measure('DashboardSnapshot (crm-insights)', () =>
    prisma.dashboardSnapshot.findUnique({ where: { metricKey: 'dashboard.crm-insights' } }),
  );
  await measure('MrrSnapshot (latest)', () =>
    prisma.mrrSnapshot.findFirst({ orderBy: { snapshotDate: 'desc' } }),
  );
  await measure('EmployeePerformanceSnapshot (today)', async () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return prisma.employeePerformanceSnapshot.findMany({ where: { snapshotDate: d } });
  });
  await measure('Live aggregate — lead.count()', () => prisma.lead.count());
  await measure('Live aggregate — payment.aggregate', () =>
    prisma.payment.aggregate({ _sum: { paidAmount: true }, where: { status: 'PAID' } }),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
