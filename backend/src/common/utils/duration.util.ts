const DEFAULT_REFRESH_SECONDS = 7 * 24 * 60 * 60;

/** Parse JWT-style duration strings (e.g. 15m, 7d, 30s) to seconds. */
export function parseDurationToSeconds(
  value: string | undefined | null,
  fallbackSeconds = DEFAULT_REFRESH_SECONDS,
): number {
  if (!value?.trim()) return fallbackSeconds;
  const match = value.trim().match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return fallbackSeconds;
  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 's':
      return amount;
    case 'm':
      return amount * 60;
    case 'h':
      return amount * 3600;
    case 'd':
      return amount * 86400;
    default:
      return fallbackSeconds;
  }
}

export function getRefreshTtlSeconds(envValue?: string): number {
  return parseDurationToSeconds(envValue ?? process.env.JWT_REFRESH_EXPIRES, DEFAULT_REFRESH_SECONDS);
}
