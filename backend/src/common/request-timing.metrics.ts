import { Injectable } from '@nestjs/common';
import { Counter, Histogram, register } from 'prom-client';

@Injectable()
export class RequestTimingMetrics {
  readonly httpDuration: Histogram<string>;
  readonly jwtDuration: Histogram<string>;
  readonly redisDuration: Histogram<string>;
  readonly prismaDuration: Histogram<string>;
  readonly redisCacheHits: Counter<string>;
  readonly redisCacheMisses: Counter<string>;

  constructor() {
    this.httpDuration =
      (register.getSingleMetric('http_request_duration_seconds') as Histogram<string>) ??
      new Histogram({
        name: 'http_request_duration_seconds',
        help: 'HTTP request duration by phase',
        labelNames: ['method', 'route', 'phase'],
        buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      });

    this.jwtDuration =
      (register.getSingleMetric('auth_jwt_duration_seconds') as Histogram<string>) ??
      new Histogram({
        name: 'auth_jwt_duration_seconds',
        help: 'JWT validation duration',
        labelNames: ['cache_hit'],
        buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
      });

    this.redisDuration =
      (register.getSingleMetric('redis_command_duration_seconds') as Histogram<string>) ??
      new Histogram({
        name: 'redis_command_duration_seconds',
        help: 'Redis command duration',
        buckets: [0.0005, 0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25],
      });

    this.prismaDuration =
      (register.getSingleMetric('prisma_query_duration_seconds') as Histogram<string>) ??
      new Histogram({
        name: 'prisma_query_duration_seconds',
        help: 'Prisma query duration',
        buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2],
      });

    this.redisCacheHits =
      (register.getSingleMetric('redis_cache_hit_total') as Counter<string>) ??
      new Counter({ name: 'redis_cache_hit_total', help: 'Redis cache hits' });

    this.redisCacheMisses =
      (register.getSingleMetric('redis_cache_miss_total') as Counter<string>) ??
      new Counter({ name: 'redis_cache_miss_total', help: 'Redis cache misses' });
  }

  recordHttpPhase(method: string, route: string, phase: string, seconds: number) {
    this.httpDuration.labels(method, route, phase).observe(seconds);
  }

  recordJwt(seconds: number, cacheHit: boolean) {
    this.jwtDuration.labels(String(cacheHit)).observe(seconds);
  }

  recordRedis(seconds: number) {
    this.redisDuration.observe(seconds);
  }

  recordPrisma(seconds: number) {
    this.prismaDuration.observe(seconds);
  }
}
