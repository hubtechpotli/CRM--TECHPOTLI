import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { addPrismaMs } from '../common/request-timing.context';
import { RequestTimingMetrics } from '../common/request-timing.metrics';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private timingMetrics: RequestTimingMetrics) {
    super({ log: [{ emit: 'event', level: 'query' }] });
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
