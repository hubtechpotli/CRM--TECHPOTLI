import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import {
  addHandlerMs,
  addSerializationMs,
  buildTimingSummary,
  formatTimingLog,
  getRequestTiming,
  isHotRoute,
} from '../request-timing.context';
import { RequestTimingMetrics } from '../request-timing.metrics';

@Injectable()
export class RequestTimingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('RequestTiming');

  constructor(private metrics: RequestTimingMetrics) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const handlerStart = performance.now();

    return next.handle().pipe(
      tap((body) => {
        const store = getRequestTiming();
        if (!store) return;

        addHandlerMs(performance.now() - handlerStart);

        if (body !== undefined && body !== null) {
          const serStart = performance.now();
          try {
            JSON.stringify(body);
          } catch {
            /* non-serializable */
          }
          addSerializationMs(performance.now() - serStart);
        }

        const summary = buildTimingSummary(store);
        const route = store.path.replace(/^\/api/, '') || store.path;
        const method = store.method;

        this.metrics.recordHttpPhase(method, route, 'total', summary.totalMs / 1000);
        this.metrics.recordHttpPhase(method, route, 'jwt', summary.jwtMs / 1000);
        this.metrics.recordHttpPhase(method, route, 'redis', summary.redisMs / 1000);
        this.metrics.recordHttpPhase(method, route, 'prisma', summary.prismaMs / 1000);
        this.metrics.recordHttpPhase(method, route, 'handler', summary.handlerMs / 1000);
        this.metrics.recordHttpPhase(method, route, 'serialization', summary.serializationMs / 1000);
        this.metrics.recordHttpPhase(method, route, 'overhead', summary.overheadMs / 1000);

        if (summary.jwtMs > 0) {
          this.metrics.recordJwt(summary.jwtMs / 1000, summary.jwtCacheHit === true);
        }

        const serverTiming = [
          `total;dur=${summary.totalMs}`,
          `jwt;dur=${summary.jwtMs}`,
          `redis;dur=${summary.redisMs}`,
          `prisma;dur=${summary.prismaMs}`,
          `handler;dur=${summary.handlerMs}`,
          `json;dur=${summary.serializationMs}`,
          `overhead;dur=${summary.overheadMs}`,
        ].join(', ');
        res.setHeader('Server-Timing', serverTiming);

        const alwaysLog = process.env.ENABLE_REQUEST_TIMING === 'true';
        const slow = summary.totalMs > 500;
        const hot = isHotRoute(route);

        if (alwaysLog || (slow && hot)) {
          this.logger.log(formatTimingLog(method, route, summary));
        }
      }),
    );
  }
}
