import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReportsModule } from '../reports/reports.module';
import { CustomersModule } from '../customers/customers.module';
import { SearchModule } from '../search/search.module';
import { CronProcessor } from './cron.processor';
import { CronSchedulerService } from './cron-scheduler.service';
import { PdfProcessor } from './pdf.processor';
import { bullConnectionFactory } from './bull.config';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: bullConnectionFactory,
    }),
    BullModule.registerQueue({ name: 'cron' }, { name: 'pdf' }),
    PrismaModule,
    UploadsModule,
    NotificationsModule,
    ReportsModule,
    CustomersModule,
    SearchModule,
  ],
  providers: [CronProcessor, CronSchedulerService, PdfProcessor],
  exports: [BullModule],
})
export class JobsModule {}
