/**
 * One-shot analytics snapshot refresh (same logic as BullMQ dashboard-snapshot cron).
 * Usage: npx ts-node scripts/refresh-snapshots.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SnapshotRefreshService } from '../src/reports/snapshot-refresh.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  try {
    const snapshots = app.get(SnapshotRefreshService);
    const start = performance.now();
    await snapshots.refreshAll();
    const ms = Math.round(performance.now() - start);
    console.log(`Snapshot refresh completed in ${ms}ms`);
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
