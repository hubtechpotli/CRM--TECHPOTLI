import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { EventsModule } from './events/events.module';
import { AiModule } from './ai/ai.module';
import { WorkflowModule } from './workflow/workflow.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { MailModule } from './mail/mail.module';
import { NotificationsModule } from './notifications/notifications.module';
import { JobsModule } from './jobs/jobs.module';

const cronJobModules = process.env.ENABLE_CRON_JOBS === 'true' ? [JobsModule] : [];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    EventsModule,
    AnalyticsModule,
    MailModule,
    NotificationsModule,
    AiModule,
    WorkflowModule,
    ...cronJobModules,
  ],
})
export class WorkerModule {}
