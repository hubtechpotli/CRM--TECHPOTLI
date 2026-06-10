import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaReadService } from './prisma-read.service';
import { MetricsModule } from '../common/metrics.module';

@Global()
@Module({
  imports: [MetricsModule],
  providers: [PrismaService, PrismaReadService],
  exports: [PrismaService, PrismaReadService],
})
export class PrismaModule {}
