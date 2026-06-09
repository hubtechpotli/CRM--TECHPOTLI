function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/$/, '');
}

export function getAllowedCorsOrigins(): string[] {
  const origins = new Set<string>();

  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl) origins.add(normalizeOrigin(frontendUrl));

  const extra = process.env.CORS_ORIGINS?.split(',')
    .map((value) => normalizeOrigin(value))
    .filter(Boolean);
  extra?.forEach((origin) => origins.add(origin));

  if (origins.size === 0) {
    origins.add('http://localhost:3000');
  }

  return [...origins];
}

export function isAllowedCorsOrigin(origin: string | undefined): boolean {
  if (!origin) return true;

  if (getAllowedCorsOrigins().includes(normalizeOrigin(origin))) {
    return true;
  }

  if (process.env.NODE_ENV !== 'production') {
    return /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/.test(
      origin,
    );
  }

  return false;
}

/** Value for Access-Control-Allow-Origin (or false to deny). */
export function resolveCorsOrigin(origin: string | undefined): string | false {
  const fallback = getAllowedCorsOrigins()[0];
  if (!origin) return fallback;
  return isAllowedCorsOrigin(origin) ? normalizeOrigin(origin) : false;
}
