import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private redis: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    _throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const redisKey = `throttle:${key}`;
    const blockKey = `throttle:block:${key}`;
    try {
      const blocked = await this.redis.get(blockKey);
      if (blocked) {
        const blockTtl = await this.redis.client.pttl(blockKey);
        return { totalHits: limit + 1, timeToExpire: 0, isBlocked: true, timeToBlockExpire: blockTtl };
      }
      const hits = await this.redis.client.incr(redisKey);
      if (hits === 1) await this.redis.client.pexpire(redisKey, ttl);
      const pttl = await this.redis.client.pttl(redisKey);
      if (hits > limit) {
        await this.redis.set(blockKey, '1', blockDuration);
        return { totalHits: hits, timeToExpire: pttl, isBlocked: true, timeToBlockExpire: blockDuration };
      }
      return { totalHits: hits, timeToExpire: pttl, isBlocked: false, timeToBlockExpire: 0 };
    } catch {
      return { totalHits: 1, timeToExpire: ttl, isBlocked: false, timeToBlockExpire: 0 };
    }
  }
}
