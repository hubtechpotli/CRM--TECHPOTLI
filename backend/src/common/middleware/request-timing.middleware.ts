import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { requestTimingStorage } from '../request-timing.context';

@Injectable()
export class RequestTimingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const path = req.originalUrl?.split('?')[0] ?? req.url;
    const store = {
      method: req.method,
      path,
      startedAt: performance.now(),
      jwtMs: 0,
      redisMs: 0,
      prismaMs: 0,
      handlerMs: 0,
      serializationMs: 0,
    };
    requestTimingStorage.run(store, () => next());
  }
}
