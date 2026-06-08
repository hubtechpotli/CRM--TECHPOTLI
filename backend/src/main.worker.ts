import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const logger = new Logger('Worker');
  const app = await NestFactory.createApplicationContext(WorkerModule);
  logger.log('TechPotli worker started (Kafka consumers + cron jobs)');
  process.on('SIGTERM', () => app.close());
}

bootstrap();
