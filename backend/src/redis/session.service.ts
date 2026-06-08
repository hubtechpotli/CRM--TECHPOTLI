import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

const SESSION_PREFIX = 'session:';
const SESSION_TTL = 7 * 24 * 60 * 60;

@Injectable()
export class SessionService {
  constructor(private redis: RedisService) {}

  async registerSession(sessionId: string, userId: string): Promise<void> {
    await this.redis.set(`${SESSION_PREFIX}${sessionId}`, userId, SESSION_TTL);
    await this.redis.set(`${SESSION_PREFIX}user:${userId}:${sessionId}`, '1', SESSION_TTL);
  }

  async isSessionValid(sessionId: string, userId: string): Promise<boolean> {
    const stored = await this.redis.get(`${SESSION_PREFIX}${sessionId}`);
    return stored === userId;
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    await this.redis.del(`${SESSION_PREFIX}${sessionId}`);
    await this.redis.del(`${SESSION_PREFIX}user:${userId}:${sessionId}`);
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
