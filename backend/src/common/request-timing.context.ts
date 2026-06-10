import { AsyncLocalStorage } from 'async_hooks';

export type RequestTimingStore = {
  method: string;
  path: string;
  startedAt: number;
  jwtMs: number;
  redisMs: number;
  prismaMs: number;
  handlerMs: number;
  serializationMs: number;
  jwtCacheHit?: boolean;
};

export const requestTimingStorage = new AsyncLocalStorage<RequestTimingStore>();

export function getRequestTiming(): RequestTimingStore | undefined {
  return requestTimingStorage.getStore();
}

export function addJwtMs(ms: number) {
  const store = getRequestTiming();
  if (store) store.jwtMs += ms;
}

export function setJwtCacheHit(cacheHit: boolean) {
  const store = getRequestTiming();
  if (store) store.jwtCacheHit = cacheHit;
}

export function addRedisMs(ms: number) {
  const store = getRequestTiming();
  if (store) store.redisMs += ms;
}

export function addPrismaMs(ms: number) {
  const store = getRequestTiming();
  if (store) store.prismaMs += ms;
}

export function addHandlerMs(ms: number) {
  const store = getRequestTiming();
  if (store) store.handlerMs += ms;
}

export function addSerializationMs(ms: number) {
  const store = getRequestTiming();
  if (store) store.serializationMs += ms;
}

export function buildTimingSummary(store: RequestTimingStore) {
  const totalMs = Math.round(performance.now() - store.startedAt);
  const accounted = Math.round(store.jwtMs + store.redisMs + store.prismaMs + store.handlerMs + store.serializationMs);
  const overheadMs = Math.max(0, totalMs - accounted);
  return {
    totalMs,
    jwtMs: Math.round(store.jwtMs),
    redisMs: Math.round(store.redisMs),
    prismaMs: Math.round(store.prismaMs),
    handlerMs: Math.round(store.handlerMs),
    serializationMs: Math.round(store.serializationMs),
    overheadMs,
    jwtCacheHit: store.jwtCacheHit,
  };
}

export function formatTimingLog(method: string, path: string, summary: ReturnType<typeof buildTimingSummary>) {
  const jwtLabel = summary.jwtCacheHit === undefined ? '' : summary.jwtCacheHit ? ' (hit)' : ' (miss)';
  return (
    `${method} ${path}\n` +
    `Total: ${summary.totalMs}ms | JWT: ${summary.jwtMs}ms${jwtLabel} | Redis: ${summary.redisMs}ms | ` +
    `Prisma: ${summary.prismaMs}ms | Handler: ${summary.handlerMs}ms | JSON: ${summary.serializationMs}ms | ` +
    `Overhead: ${summary.overheadMs}ms`
  );
}

export function isHotRoute(path: string): boolean {
  return (
    path.startsWith('/reports') ||
    path.startsWith('/customers') ||
    path.startsWith('/projects') ||
    path.startsWith('/search') ||
    path.startsWith('/team-updates')
  );
}
