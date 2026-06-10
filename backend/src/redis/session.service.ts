import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

const SESSION_PREFIX = 'session:';
const SESSION_CTX_PREFIX = 'session:ctx:';
const SESSION_TTL = 7 * 24 * 60 * 60;
const SESSION_CTX_TTL = 14 * 60;

@Injectable()
export class SessionService {
  constructor(private redis: RedisService) {}

  async registerSession(sessionId: string, userId: string): Promise<void> {
    await this.redis.set(`${SESSION_PREFIX}${sessionId}`, userId, SESSION_TTL);
    await this.redis.set(`${SESSION_PREFIX}user:${userId}:${sessionId}`, '1', SESSION_TTL);
  }

  async getRaw(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async setRaw(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, value, ttlSeconds);
  }

  async isSessionValid(sessionId: string, userId: string): Promise<boolean> {
    if (!(await this.redis.ping())) {
      return true;
    }
    const stored = await this.redis.get(`${SESSION_PREFIX}${sessionId}`);
    return stored === userId;
  }

  async getSessionContext<T>(sessionId: string): Promise<T | null> {
    const raw = await this.redis.get(`${SESSION_CTX_PREFIX}${sessionId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setSessionContext(sessionId: string, ctx: unknown): Promise<void> {
    await this.redis.set(`${SESSION_CTX_PREFIX}${sessionId}`, JSON.stringify(ctx), SESSION_CTX_TTL);
  }

  async clearSessionContext(sessionId: string): Promise<void> {
    await this.redis.del(`${SESSION_CTX_PREFIX}${sessionId}`);
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    await this.redis.del(`${SESSION_PREFIX}${sessionId}`);
    await this.redis.del(`${SESSION_PREFIX}user:${userId}:${sessionId}`);
    await this.clearSessionContext(sessionId);
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    const pattern = `${SESSION_PREFIX}user:${userId}:*`;
    try {
      const keys = await this.redis.client.keys(pattern);
      for (const key of keys) {
        const sessionId = key.split(':').pop();
        if (sessionId) await this.redis.del(`${SESSION_PREFIX}${sessionId}`);
        await this.redis.del(key);
      }
    } catch {
      /* noop when redis offline */
    }
  }
}
