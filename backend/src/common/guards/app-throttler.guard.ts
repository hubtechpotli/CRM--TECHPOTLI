import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { getRefreshCookie } from '../utils/cookie.util';
import { normalizeClientIp } from '../utils/ip.util';

function clientIpFromRequest(req: Record<string, unknown>): string {
  const headers = req.headers as Record<string, string | string[] | undefined> | undefined;
  const xff = headers?.['x-forwarded-for'];
  const raw =
    (typeof xff === 'string' ? xff.split(',')[0]?.trim() : Array.isArray(xff) ? xff[0] : undefined) ||
    (req.ip as string | undefined) ||
    '127.0.0.1';
  return normalizeClientIp(raw);
}

function userIdFromBearer(req: Record<string, unknown>): string | null {
  const headers = req.headers as Record<string, string | undefined> | undefined;
  const auth = headers?.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const segment = auth.slice(7).split('.')[1];
    if (!segment) return null;
    const json = Buffer.from(segment, 'base64url').toString('utf8');
    const payload = JSON.parse(json) as { sub?: string };
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

function isAuthLogin(req: Record<string, unknown>): boolean {
  const url = String(req.url ?? '');
  const routePath = (req.route as { path?: string } | undefined)?.path ?? '';
  return (
    String(req.method ?? '').toUpperCase() === 'POST' &&
    (routePath === '/login' || url.includes('/auth/login'))
  );
}

function is2faVerify(req: Record<string, unknown>): boolean {
  const url = String(req.url ?? '');
  const routePath = (req.route as { path?: string } | undefined)?.path ?? '';
  return (
    String(req.method ?? '').toUpperCase() === 'POST' &&
    (routePath.includes('2fa/verify') || url.includes('/auth/2fa/verify'))
  );
}

function isAuthRefresh(req: Record<string, unknown>): boolean {
  const url = String(req.url ?? '');
  const routePath = (req.route as { path?: string } | undefined)?.path ?? '';
  return (
    String(req.method ?? '').toUpperCase() === 'POST' &&
    (routePath === '/refresh' || url.includes('/auth/refresh'))
  );
}

/**
 * Rate-limit buckets are per-user/session where possible so a shared office IP
 * (20+ employees on one Wi‑Fi) does not share one login/API quota.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    if (process.env.DISABLE_AUTH_THROTTLE === 'true') {
      const { req } = this.getRequestResponse(context);
      const url = String(req.url ?? '');
      if (url.includes('/auth/login') || url.includes('/auth/2fa/verify') || url.includes('/auth/refresh')) {
        return true;
      }
    }
    return false;
  }

  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const body = req.body as { email?: string; tempToken?: string } | undefined;

    // Login: per email (not per office IP) — 20 staff on same Wi‑Fi each get their own bucket
    if (isAuthLogin(req)) {
      const email = typeof body?.email === 'string' ? body.email.toLowerCase().trim() : '';
      if (email) return `login:${email}`;
    }

    // 2FA: per pending session token
    if (is2faVerify(req)) {
      const token = typeof body?.tempToken === 'string' ? body.tempToken.slice(0, 32) : '';
      if (token) return `2fa:${token}`;
    }

    // Refresh: per browser session cookie (morning rush safe for whole office)
    if (isAuthRefresh(req)) {
      const headers = req.headers as { cookie?: string } | undefined;
      const refresh = getRefreshCookie(headers?.cookie);
      if (refresh) return `refresh:${refresh.slice(0, 32)}`;
    }

    // Logged-in API traffic: per user, not per office IP
    const userId = userIdFromBearer(req);
    if (userId) return `user:${userId}`;

    return `ip:${clientIpFromRequest(req)}`;
  }
}
