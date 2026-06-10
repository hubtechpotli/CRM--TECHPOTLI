import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from '../redis/session.service';

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
    });
  }

  async validate(payload: { sub: string; email: string; role: string; sid?: string }) {
    if (!payload.sid) throw new UnauthorizedException('Session expired');

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

    const activityKey = `session:active:${payload.sid}`;
    const recentlyActive = await this.sessions.getRaw(activityKey);
    if (!recentlyActive) {
      await this.prisma.userSession.update({
        where: { id: payload.sid },
        data: { lastActiveAt: new Date() },
      });
      await this.sessions.setRaw(activityKey, '1', 300);
    }

    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      sid: payload.sid,
      mustChangePassword: user.mustChangePassword,
      allowedIPs: user.allowedIPs,
      allowRemoteAccess: user.allowRemoteAccess,
      twoFactorEnabled: user.twoFactorEnabled,
    };
  }
}
