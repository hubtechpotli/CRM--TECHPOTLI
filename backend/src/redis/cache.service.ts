import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';
import { ConsistentHashRing } from './hash-ring';
import { RequestTimingMetrics } from '../common/request-timing.metrics';

@Injectable()
export class CacheService {
  private readonly ring: ConsistentHashRing;

  constructor(
    private redis: RedisService,
    private timingMetrics: RequestTimingMetrics,
  ) {
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
    if (cached !== null) {
      this.timingMetrics.redisCacheHits.inc();
      return cached;
    }
    this.timingMetrics.redisCacheMisses.inc();
    const result = await fn();
    await this.set(key, result, ttlSeconds);
    return result;
  }

  async namespaceVersion(namespace: string): Promise<string> {
    const v = await this.redis.get(`cache:ns:${namespace}`);
    return v ?? '0';
  }

  async bumpNamespace(namespace: string): Promise<void> {
    try {
      const current = await this.redis.get(`cache:ns:${namespace}`);
      const next = String((current ? parseInt(current, 10) : 0) + 1);
      await this.redis.set(`cache:ns:${namespace}`, next);
    } catch {
      /* noop */
    }
  }
}
