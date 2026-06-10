import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { addPrismaMs } from '../common/request-timing.context';
import { RequestTimingMetrics } from '../common/request-timing.metrics';

@Injectable()
export class PrismaReadService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(
    config: ConfigService,
    private timingMetrics: RequestTimingMetrics,
  ) {
    const readUrl = config.get<string>('DATABASE_READ_URL') || config.get<string>('DATABASE_URL');
    super({
      datasources: { db: { url: readUrl } },
      log: [{ emit: 'event', level: 'query' }],
    });
  }

  async onModuleInit() {
    this.$on('query' as never, (event: Prisma.QueryEvent) => {
      addPrismaMs(event.duration);
      this.timingMetrics.recordPrisma(event.duration / 1000);
    });
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
