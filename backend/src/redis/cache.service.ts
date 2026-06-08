import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';
import { ConsistentHashRing } from './hash-ring';

@Injectable()
export class CacheService {
  private readonly ring: ConsistentHashRing;

  constructor(private redis: RedisService) {
    const nodes = (process.env.REDIS_SHARD_NODES || 'shard-0,shard-1,shard-2').split(',');
    this.ring = new ConsistentHashRing(nodes);
  }

  private key(k: string) {
    return `cache:${this.ring.shardKey(k)}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(this.key(key));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 120): Promise<void> {
    await this.redis.set(this.key(key), JSON.stringify(value), ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(this.key(key));
  }

  async wrap<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const result = await fn();
    await this.set(key, result, ttlSeconds);
    return result;
  }
}
