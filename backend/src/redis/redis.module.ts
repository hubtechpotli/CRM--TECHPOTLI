import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { CacheService } from './cache.service';
import { SessionService } from './session.service';
import { RedisThrottlerStorage } from '../common/redis-throttler.storage';
import { MetricsModule } from '../common/metrics.module';

@Global()
@Module({
  imports: [MetricsModule],
  providers: [RedisService, CacheService, SessionService, RedisThrottlerStorage],
  exports: [RedisService, CacheService, SessionService, RedisThrottlerStorage],
})
export class RedisModule {}
