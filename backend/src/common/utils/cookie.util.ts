import { Response } from 'express';
import { getRefreshTtlSeconds } from './duration.util';

const REFRESH_COOKIE = 'refreshToken';

function refreshMaxAgeSeconds(): number {
  return getRefreshTtlSeconds();
}
/** Root path so the refresh cookie is sent reliably via Next.js /api proxy and direct API calls. */
const COOKIE_PATH = '/';

type SameSiteValue = 'Strict' | 'Lax' | 'None';

function resolveCookieOptions(): { secure: boolean; sameSite: SameSiteValue } {
  const explicitSecure = process.env.COOKIE_SECURE;
  const explicitSameSite = process.env.COOKIE_SAME_SITE?.toLowerCase();

  if (explicitSameSite === 'none' || explicitSameSite === 'lax' || explicitSameSite === 'strict') {
    const sameSite = (explicitSameSite.charAt(0).toUpperCase() + explicitSameSite.slice(1)) as SameSiteValue;
    const secure =
      explicitSecure === 'true'
        ? true
        : explicitSecure === 'false'
          ? false
          : sameSite === 'None' || process.env.NODE_ENV === 'production';
    return { secure, sameSite };
  }

  const frontendUrl = process.env.FRONTEND_URL || '';
  const apiUrl = process.env.PUBLIC_API_URL || process.env.API_URL || '';
  const frontendHost = tryHost(frontendUrl);
  const apiHost = tryHost(apiUrl);

  if (frontendHost && apiHost && frontendHost !== apiHost) {
    return { secure: true, sameSite: 'None' };
  }

  const secure =
    explicitSecure === 'true'
      ? true
      : explicitSecure === 'false'
        ? false
        : process.env.NODE_ENV === 'production';

  return { secure, sameSite: 'Lax' };
}

function tryHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

function buildCookieParts(token: string, maxAge: number): string[] {
  const { secure, sameSite } = resolveCookieOptions();
  const parts = [
    `${REFRESH_COOKIE}=${encodeURIComponent(token)}`,
    'HttpOnly',
    `Path=${COOKIE_PATH}`,
    `Max-Age=${maxAge}`,
    `SameSite=${sameSite}`,
  ];
  if (secure) parts.push('Secure');
  return parts;
}

export function setRefreshCookie(res: Response, token: string) {
  res.setHeader('Set-Cookie', buildCookieParts(token, refreshMaxAgeSeconds()).join('; '));
}

export function clearRefreshCookie(res: Response) {
  res.setHeader('Set-Cookie', buildCookieParts('', 0).join('; '));
}

export function getRefreshCookie(cookieHeader?: string): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(/(?:^|;\s*)refreshToken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}
