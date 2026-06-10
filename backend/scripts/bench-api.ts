/**
 * API benchmark with P50 / P95 / P99 latency percentiles.
 *
 * Usage:
 *   API_URL=http://localhost:3001/api TOKEN=<jwt> ITERATIONS=30 npx ts-node scripts/bench-api.ts
 *   API_URL=... TOKEN=... OUTPUT=../docs/bench-after.json npx ts-node scripts/bench-api.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const baseURL = process.env.API_URL || 'http://localhost:3001/api';
const token = process.env.TOKEN || '';
const iterations = Math.max(5, parseInt(process.env.ITERATIONS || '30', 10));
const warmup = Math.min(3, iterations);

async function apiGet(
  path: string,
  params?: Record<string, string | number>,
): Promise<{ status: number; data: unknown }> {
  const url = new URL(path, baseURL.endsWith('/') ? baseURL : `${baseURL}/`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal: AbortSignal.timeout(60_000),
  });
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = await res.text();
  }
  return { status: res.status, data };
}

type Sample = { ms: number; status: number; bytes: number };
type EndpointStats = {
  name: string;
  samples: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
  errors: number;
  lastStatus: number;
};

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

async function sample(fn: () => Promise<{ status: number; data: unknown }>): Promise<Sample> {
  const start = performance.now();
  const res = await fn();
  const ms = performance.now() - start;
  const bytes = JSON.stringify(res.data ?? '').length;
  return { ms, status: res.status, bytes };
}

async function benchEndpoint(
  name: string,
  run: () => Promise<{ status: number; data: unknown }>,
): Promise<EndpointStats> {
  for (let i = 0; i < warmup; i++) await run();

  const samples: Sample[] = [];
  for (let i = 0; i < iterations; i++) {
    samples.push(await sample(run));
  }

  const times = samples.map((s) => s.ms).sort((a, b) => a - b);
  const errors = samples.filter((s) => s.status >= 400).length;
  const sum = times.reduce((a, b) => a + b, 0);

  return {
    name,
    samples: samples.length,
    p50: Math.round(percentile(times, 50)),
    p95: Math.round(percentile(times, 95)),
    p99: Math.round(percentile(times, 99)),
    min: Math.round(times[0] ?? 0),
    max: Math.round(times[times.length - 1] ?? 0),
    avg: Math.round(sum / (times.length || 1)),
    errors,
    lastStatus: samples[samples.length - 1]?.status ?? 0,
  };
}

function formatRow(s: EndpointStats): string {
  const err = s.errors ? ` ERR:${s.errors}` : '';
  return `${s.name.padEnd(42)} p50=${String(s.p50).padStart(5)}ms p95=${String(s.p95).padStart(5)}ms p99=${String(s.p99).padStart(5)}ms  HTTP ${s.lastStatus}${err}`;
}

async function main() {
  if (!token) {
    console.warn('Warning: TOKEN not set — authenticated endpoints will return 401.\n');
  }

  const endpoints: Array<{ name: string; run: () => Promise<{ status: number; data: unknown }> }> = [
    { name: 'Dashboard (/reports/crm-insights)', run: () => apiGet('reports/crm-insights') },
    { name: 'Dashboard KPIs (/reports/dashboard)', run: () => apiGet('reports/dashboard') },
    { name: 'Customers (/customers/directory)', run: () => apiGet('customers/directory', { limit: 20, page: 1 }) },
    { name: 'Projects (/projects)', run: () => apiGet('projects', { limit: 20, page: 1 }) },
    { name: 'Reports MRR (/reports/mrr)', run: () => apiGet('reports/mrr') },
    { name: 'Reports employee-perf', run: () => apiGet('reports/employee-performance') },
    { name: 'Search (/search?q=test)', run: () => apiGet('search', { q: 'test' }) },
    { name: 'Team Updates (/team-updates/feed)', run: () => apiGet('team-updates/feed', { limit: 20 }) },
  ];

  console.log(`Benchmark: ${baseURL}`);
  console.log(`Iterations: ${iterations} (warmup ${warmup})\n`);

  const results: EndpointStats[] = [];
  for (const ep of endpoints) {
    process.stdout.write(`Running ${ep.name}… `);
    const stats = await benchEndpoint(ep.name, ep.run);
    results.push(stats);
    console.log('done');
  }

  console.log('\n--- Results (ms) ---\n');
  for (const r of results) console.log(formatRow(r));

  const payload = {
    generatedAt: new Date().toISOString(),
    baseURL,
    iterations,
    results,
  };

  const output = process.env.OUTPUT;
  if (output) {
    const outPath = path.resolve(__dirname, '..', output);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`\nWrote ${outPath}`);
  }

  const failing = results.filter((r) => r.errors > 0 || r.p95 > 500);
  if (failing.length) {
    console.log(`\n⚠ Review: ${failing.map((r) => r.name).join(', ')}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
