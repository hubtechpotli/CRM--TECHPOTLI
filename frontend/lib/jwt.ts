/** Decode JWT expiry (ms since epoch). Returns null if invalid. */
export function getJwtExpiryMs(token: string): number | null {
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64)) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** True when token is missing, malformed, or within skewMs of expiry. */
export function isJwtExpired(token: string, skewMs = 60_000): boolean {
  const exp = getJwtExpiryMs(token);
  if (!exp) return true;
  return Date.now() >= exp - skewMs;
}
