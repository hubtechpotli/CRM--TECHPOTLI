import { UnauthorizedException } from '@nestjs/common';
import { normalizeClientIp, parseUserAgent } from './ip.util';

export function sessionIpMatches(
  sessionIp: string | null | undefined,
  currentIp: string,
): boolean {
  if (!sessionIp) return true;
  return normalizeClientIp(sessionIp) === normalizeClientIp(currentIp);
}

export function sessionBrowserMatches(
  sessionBrowser: string | null | undefined,
  userAgent: string,
): boolean {
  if (!sessionBrowser || sessionBrowser === 'Unknown') return true;
  const { browser } = parseUserAgent(userAgent);
  return browser === sessionBrowser;
}

export function assertSessionClientMatches(
  session: {
    ip?: string | null;
    browser?: string | null;
  },
  currentIp: string,
  userAgent: string,
): void {
  if (!sessionIpMatches(session.ip, currentIp)) {
    throw new UnauthorizedException(
      'Session ended because your network changed. Please sign in again.',
    );
  }
  if (!sessionBrowserMatches(session.browser, userAgent)) {
    throw new UnauthorizedException(
      'Session ended because your browser changed. Please sign in again.',
    );
  }
}
