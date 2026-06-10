/**
 * One-shot search index rebuild.
 * Usage: npx ts-node --transpile-only scripts/refresh-search-index.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SearchIndexService } from '../src/search/search-index.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  try {
    const svc = app.get(SearchIndexService);
    const start = performance.now();
    await svc.rebuildAll();
    console.log(`Search index rebuilt in ${Math.round(performance.now() - start)}ms`);
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
