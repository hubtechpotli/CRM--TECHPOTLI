import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CronProcessor } from './cron.processor';
import { CronSchedulerService } from './cron-scheduler.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL');
        return { connection: url ? { url } : { host: '127.0.0.1', port: 6379 } };
      },
    }),
    BullModule.registerQueue({ name: 'cron' }),
  ],
  providers: [CronProcessor, CronSchedulerService],
})
export class JobsModule {}
