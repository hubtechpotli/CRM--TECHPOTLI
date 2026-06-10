import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from '../redis/session.service';
import { buildSessionClientUpdate } from '../common/utils/session-client.util';

type SessionContext = {
  sub: string;
  email: string;
  role: string;
  sid: string;
  mustChangePassword: boolean;
  allowedIPs: string[];
  allowRemoteAccess: boolean;
  twoFactorEnabled: boolean;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
    private sessions: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET'),
      passReqToCallback: true,
    });
  }

  private sessionCacheEnabled() {
    return process.env.ENABLE_SESSION_CACHE !== 'false';
  }

  async validate(
    req: Request,
    payload: { sub: string; email: string; role: string; sid?: string },
  ) {
    if (!payload.sid) throw new UnauthorizedException('Session expired');

    if (this.sessionCacheEnabled()) {
      const cached = await this.sessions.getSessionContext<SessionContext>(payload.sid);
      if (cached && cached.sub === payload.sub) {
        const valid = await this.sessions.isSessionValid(payload.sid, payload.sub);
        if (valid) {
          void this.touchActivity(payload.sid, req);
          return cached;
        }
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        allowedIPs: true,
        allowRemoteAccess: true,
        twoFactorEnabled: true,
        mustChangePassword: true,
      },
    });
    if (!user?.isActive) throw new UnauthorizedException('Session expired');
    if (!user.twoFactorEnabled) {
      throw new UnauthorizedException('Two-factor authentication required. Please sign in again.');
    }

    const session = await this.prisma.userSession.findFirst({
      where: { id: payload.sid, userId: payload.sub, expiresAt: { gt: new Date() } },
    });
    if (!session) throw new UnauthorizedException('Session expired');

    const valid = await this.sessions.isSessionValid(payload.sid, payload.sub);
    if (!valid) throw new UnauthorizedException('Session expired');

    await this.touchActivity(payload.sid, req);

    const ctx: SessionContext = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sid: payload.sid,
      mustChangePassword: user.mustChangePassword,
      allowedIPs: user.allowedIPs,
      allowRemoteAccess: user.allowRemoteAccess,
      twoFactorEnabled: user.twoFactorEnabled,
    };

    if (this.sessionCacheEnabled()) {
      void this.sessions.setSessionContext(payload.sid, ctx);
    }

    return ctx;
  }

  private async touchActivity(sessionId: string, req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'unknown';
    const activityKey = `session:active:${sessionId}`;
    const recentlyActive = await this.sessions.getRaw(activityKey);
    if (!recentlyActive) {
      await this.prisma.userSession.update({
        where: { id: sessionId },
        data: buildSessionClientUpdate(ip, userAgent),
      });
      await this.sessions.setRaw(activityKey, '1', 300);
    }
  }
}
