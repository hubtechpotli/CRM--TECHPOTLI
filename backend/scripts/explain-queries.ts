/**
 * Run EXPLAIN ANALYZE on representative hot-path queries.
 * Usage: npx ts-node scripts/explain-queries.ts > ../docs/QUERY_ANALYSIS_RAW.txt
 */
import { PrismaClient, Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

type ExplainRow = { 'QUERY PLAN': string };

async function explain(label: string, sql: Prisma.Sql): Promise<string> {
  const rows = await prisma.$queryRaw<ExplainRow[]>(Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${sql}`);
  const plan = rows.map((r) => r['QUERY PLAN']).join('\n');
  return `## ${label}\n\n\`\`\`\n${plan}\n\`\`\`\n`;
}

async function main() {
  const sections: string[] = [
    '# Query Analysis (EXPLAIN ANALYZE)\n',
    `Generated: ${new Date().toISOString()}\n`,
    'Database: production/staging Postgres via DATABASE_URL\n',
  ];

  sections.push(
    await explain(
      'Customers directory (paginated, active)',
      Prisma.sql`
        SELECT c.*, COUNT(w.id) AS open_work_items
        FROM "Customer" c
        LEFT JOIN "CustomerWorkItem" w ON w."customerId" = c.id AND w.status NOT IN ('COMPLETED', 'CANCELLED')
        WHERE c.status = 'ACTIVE'
        GROUP BY c.id
        ORDER BY c."createdAt" DESC
        LIMIT 20 OFFSET 0`,
    ),
  );

  sections.push(
    await explain(
      'Projects list (paginated)',
      Prisma.sql`
        SELECT * FROM "Project"
        WHERE status != 'COMPLETED'
        ORDER BY "updatedAt" DESC
        LIMIT 20 OFFSET 0`,
    ),
  );

  sections.push(
    await explain(
      'Payments (paid, recent)',
      Prisma.sql`
        SELECT * FROM "Payment"
        WHERE status = 'PAID'
        ORDER BY COALESCE("collectedAt", "createdAt") DESC
        LIMIT 20`,
    ),
  );

  sections.push(
    await explain(
      'Reports — dashboard snapshot read',
      Prisma.sql`
        SELECT "metricKey", "value", "updatedAt"
        FROM "DashboardSnapshot"
        WHERE "metricKey" IN ('dashboard.kpis', 'dashboard.crm-insights')`,
    ),
  );

  sections.push(
    await explain(
      'Reports — MRR snapshot read',
      Prisma.sql`
        SELECT * FROM "MrrSnapshot"
        ORDER BY "snapshotDate" DESC
        LIMIT 1`,
    ),
  );

  sections.push(
    await explain(
      'Team updates feed (work items)',
      Prisma.sql`
        SELECT wi.*, c."companyName" AS customer_name
        FROM "CustomerWorkItem" wi
        JOIN "Customer" c ON c.id = wi."customerId"
        WHERE wi.status NOT IN ('COMPLETED', 'CANCELLED')
        ORDER BY wi."updatedAt" DESC
        LIMIT 20`,
    ),
  );

  sections.push(
    await explain(
      'Customer timeline (paginated)',
      Prisma.sql`
        SELECT * FROM "CustomerTimelineEvent"
        WHERE "customerId" = (SELECT id FROM "Customer" LIMIT 1)
        ORDER BY "createdAt" DESC
        LIMIT 20`,
    ),
  );

  const out = sections.join('\n');
  const docsDir = path.join(__dirname, '..', '..', 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(path.join(docsDir, 'QUERY_ANALYSIS_REPORT.md'), out, 'utf8');
  console.log(out);
  console.log('\nWrote docs/QUERY_ANALYSIS_REPORT.md');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
