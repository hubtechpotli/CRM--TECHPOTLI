import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { bullConnectionFactory } from './jobs/bull.config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { RequestTimingMiddleware } from './common/middleware/request-timing.middleware';
import { RequestTimingInterceptor } from './common/interceptors/request-timing.interceptor';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { RedisThrottlerStorage } from './common/redis-throttler.storage';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UsersModule } from './users/users.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard, IpWhitelistGuard } from './common/guards/auth.guards';
import { MustChangePasswordGuard } from './common/guards/must-change-password.guard';
import { EncryptionService } from './common/encryption.service';
import { LeadsModule } from './leads/leads.module';
import { CustomersModule } from './customers/customers.module';
import { ProjectsModule } from './projects/projects.module';
import { InvoicesModule } from './invoices/invoices.module';
import { QuotationsModule } from './quotations/quotations.module';
import { PaymentsModule } from './payments/payments.module';
import { RenewalsModule } from './renewals/renewals.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ExpensesModule } from './expenses/expenses.module';
import { SupportModule } from './support/support.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { SearchModule } from './search/search.module';
import { NumberSequenceModule } from './common/number-sequence.module';
import { MailModule } from './mail/mail.module';
import { UploadsModule } from './uploads/uploads.module';
import { PdfModule } from './pdf/pdf.module';
import { JobsModule } from './jobs/jobs.module';
import { PortalModule } from './portal/portal.module';
import { ExportModule } from './export/export.module';
import { EventsModule } from './events/events.module';
import { AiModule } from './ai/ai.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { MetricsModule } from './common/metrics.module';
import { LoggerModule } from 'nestjs-pino';
import { WorkflowModule } from './workflow/workflow.module';
import { EmailModule } from './email/email.module';
import { TeamUpdatesModule } from './team-updates/team-updates.module';
import { NotepadModule } from './notepad/notepad.module';

const cronJobModules =
  process.env.ENABLE_CRON_JOBS === 'true' && process.env.APP_MODE !== 'worker' ? [JobsModule] : [];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: bullConnectionFactory,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
        autoLogging: true,
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      useFactory: (storage: RedisThrottlerStorage) => ({
        throttlers: [{ ttl: 60000, limit: 100 }],
        storage,
      }),
      inject: [RedisThrottlerStorage],
    }),
    MetricsModule,
    PrismaModule,
    RedisModule,
    EventsModule,
    AnalyticsModule,
    AiModule,
    WorkflowModule,
    EmailModule,
    NumberSequenceModule,
    MailModule,
    PdfModule,
    AuthModule,
    HealthModule,
    ActivityLogModule,
    NotificationsModule,
    UsersModule,
    LeadsModule,
    CustomersModule,
    ProjectsModule,
    InvoicesModule,
    QuotationsModule,
    PaymentsModule,
    RenewalsModule,
    AttendanceModule,
    ExpensesModule,
    SupportModule,
    ReportsModule,
    TeamUpdatesModule,
    NotepadModule,
    SettingsModule,
    ApprovalsModule,
    SearchModule,
    UploadsModule,
    ...cronJobModules,
    PortalModule,
    ExportModule,
  ],
  providers: [
    EncryptionService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: MustChangePasswordGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: IpWhitelistGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestTimingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestTimingMiddleware).forRoutes('*');
  }
}
