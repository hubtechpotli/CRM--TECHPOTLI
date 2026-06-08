import { Response } from 'express';

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60;

export function setRefreshCookie(res: Response, token: string) {
  const secure = process.env.NODE_ENV === 'production';
  const parts = [
    `${REFRESH_COOKIE}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/api/auth',
    `Max-Age=${REFRESH_MAX_AGE}`,
    'SameSite=Strict',
  ];
  if (secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearRefreshCookie(res: Response) {
  const secure = process.env.NODE_ENV === 'production';
  const parts = [
    `${REFRESH_COOKIE}=`,
    'HttpOnly',
    'Path=/api/auth',
    'Max-Age=0',
    'SameSite=Strict',
  ];
  if (secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function getRefreshCookie(cookieHeader?: string): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(/(?:^|;\s*)refreshToken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}
