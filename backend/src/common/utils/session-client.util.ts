import { normalizeClientIp, parseUserAgent } from './ip.util';

/** Soft-update session audit fields without invalidating the session. */
export function buildSessionClientUpdate(ip: string, userAgent: string) {
  const { device, browser } = parseUserAgent(userAgent);
  return {
    ip: normalizeClientIp(ip),
    browser,
    device,
    userAgent,
    lastActiveAt: new Date(),
  };
}
