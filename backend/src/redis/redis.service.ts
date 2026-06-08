import { Global, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor(config: ConfigService) {
    const url = config.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.client = new Redis(url, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      connectTimeout: 2000,
      commandTimeout: 2000,
      retryStrategy: () => null,
    });
    this.client.on('error', () => {
      /* prevent unhandled ioredis errors when Redis is offline */
    });
    this.client.connect().catch(() => {
      const cronEnabled = process.env.ENABLE_CRON_JOBS === 'true';
      if (cronEnabled) {
        this.logger.warn(
          'Redis unavailable — cron reminders need Redis. Start Redis or set REDIS_URL to a cloud instance.',
        );
      } else {
        this.logger.log('Redis not running (optional for local dev — login and CRM still work)');
      }
    });
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) await this.client.setex(key, ttlSeconds, value);
      else await this.client.set(key, value);
    } catch {
      /* noop */
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch {
      /* noop */
    }
  }

  async ping(): Promise<boolean> {
    try {
      if (this.client.status !== 'ready') return false;
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
