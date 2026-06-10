/**
 * One-shot customer summary refresh.
 * Usage: npx ts-node --transpile-only scripts/refresh-customer-summaries.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CustomerSummaryRefreshService } from '../src/customers/customer-summary-refresh.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  try {
    const svc = app.get(CustomerSummaryRefreshService);
    const start = performance.now();
    await svc.refreshAll();
    console.log(`Customer summaries refreshed in ${Math.round(performance.now() - start)}ms`);
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
