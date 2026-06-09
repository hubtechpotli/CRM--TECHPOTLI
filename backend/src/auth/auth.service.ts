import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SessionService } from '../redis/session.service';
import { EncryptionService } from '../common/encryption.service';
import { IpAccessService } from '../common/services/ip-access.service';
import { parseUserAgent } from '../common/utils/ip.util';
import { v4 as uuidv4 } from 'uuid';

const BCRYPT_ROUNDS = 12;
const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_TTL = 900;
const TWO_FA_ATTEMPTS = 5;
const REFRESH_TTL = 7 * 24 * 60 * 60;
const REFRESH_GRACE_SECONDS = 30;

type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  passwordHash?: string;
  isActive: boolean;
  twoFactorSecret: string | null;
  twoFactorEnabled: boolean;
  allowRemoteAccess: boolean;
  mustChangePassword: boolean;
  allowedIPs: string[];
};

const profileSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  department: true,
  designation: true,
  mustChangePassword: true,
} as const;

export type AuthResult = {
  accessToken?: string;
  refreshToken?: string;
  user?: { id: string; email: string; name: string; role: string; mustChangePassword?: boolean };
  sessionId?: string;
  requires2FA?: boolean;
  tempToken?: string;
  requires2FASetup?: boolean;
  setupToken?: string;
  backupCodes?: string[];
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private redis: RedisService,
    private sessions: SessionService,
    private encryption: EncryptionService,
    private ipAccess: IpAccessService,
  ) {}

  async login(email: string, password: string, ip: string, userAgent: string): Promise<AuthResult> {
    const lockKey = `login:lock:${email.toLowerCase()}`;
    if (await this.redis.get(lockKey)) {
      throw new UnauthorizedException('Account locked. Try again in 15 minutes.');
    }

    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    const fail = async () => {
      const attemptsKey = `login:attempts:${email.toLowerCase()}`;
      const raw = await this.redis.get(attemptsKey);
      const attempts = (parseInt(raw || '0', 10) || 0) + 1;
      await this.redis.set(attemptsKey, String(attempts), LOCKOUT_TTL);
      if (attempts >= LOCKOUT_ATTEMPTS) await this.redis.set(lockKey, '1', LOCKOUT_TTL);
      await this.prisma.loginHistory.create({
        data: { email, success: false, ip, ...parseUserAgent(userAgent), userAgent },
      });
      throw new UnauthorizedException('Invalid credentials');
    };

    if (!user?.isActive) await fail();
    const valid = await bcrypt.compare(password, user!.passwordHash);
    if (!valid) await fail();

    await this.redis.del(`login:attempts:${email.toLowerCase()}`);
    await this.ipAccess.assertLoginAllowed(user!, ip);

    const settings = await this.prisma.systemSettings.findUnique({ where: { id: 'default' } });
    const force2FA = settings?.force2FA ?? false;

    if (force2FA && !user!.twoFactorEnabled) {
      return {
        requires2FASetup: true,
        setupToken: this.createFlowToken(user!.id, '2fa-enroll', '15m'),
      };
    }

    if (user!.twoFactorEnabled && user!.twoFactorSecret) {
      return {
        requires2FA: true,
        tempToken: this.createFlowToken(user!.id, '2fa-verify', '5m'),
      };
    }

    return this.issueTokens(user!, ip, userAgent);
  }

  async verify2fa(tempToken: string, code: string, ip: string, userAgent: string): Promise<AuthResult> {
    const userId = this.verifyFlowToken(tempToken, '2fa-verify');

    const attemptsKey = `2fa:attempts:${tempToken}`;
    const rawAttempts = await this.redis.get(attemptsKey);
    const attempts = parseInt(rawAttempts || '0', 10) || 0;
    if (attempts >= TWO_FA_ATTEMPTS) {
      throw new UnauthorizedException('Too many attempts. Sign in again.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isActive) throw new UnauthorizedException('Invalid session');

    await this.ipAccess.assertLoginAllowed(user, ip);

    let verified = false;
    if (user.twoFactorSecret) {
      const secret = this.encryption.decrypt(user.twoFactorSecret);
      verified = speakeasy.totp.verify({ secret, encoding: 'base32', token: code, window: 1 });
    }
    if (!verified) {
      const backups = await this.prisma.twoFactorBackupCode.findMany({
        where: { userId, used: false },
      });
      for (const backup of backups) {
        const match = await bcrypt.compare(code, backup.codeHash);
        if (match) {
          verified = true;
          await this.prisma.twoFactorBackupCode.update({
            where: { id: backup.id },
            data: { used: true, usedAt: new Date() },
          });
          break;
        }
      }
    }
    if (!verified) {
      await this.redis.set(attemptsKey, String(attempts + 1), 300);
      throw new UnauthorizedException('Invalid OTP');
    }

    await this.redis.del(attemptsKey);
    return this.issueTokens(user, ip, userAgent);
  }

  async setup2faEnroll(setupToken: string) {
    const userId = this.verifyFlowToken(setupToken, '2fa-enroll');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isActive || user.twoFactorEnabled) {
      throw new BadRequestException('Setup session expired. Sign in again.');
    }

    const secret = speakeasy.generateSecret({ name: 'TechPotli Business OS' });
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: this.encryption.encrypt(secret.base32) },
    });
    return { secret: secret.base32, qrCode };
  }

  async confirm2faEnroll(setupToken: string, code: string, ip: string, userAgent: string): Promise<AuthResult> {
    const userId = this.verifyFlowToken(setupToken, '2fa-enroll');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isActive || !user.twoFactorSecret) {
      throw new BadRequestException('Setup expired. Start again.');
    }

    const secret = this.encryption.decrypt(user.twoFactorSecret);
    const ok = speakeasy.totp.verify({ secret, encoding: 'base32', token: code, window: 1 });
    if (!ok) throw new BadRequestException('Invalid code');

    const backupCodes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const codePlain = uuidv4().slice(0, 8).toUpperCase();
      backupCodes.push(codePlain);
      await this.prisma.twoFactorBackupCode.create({
        data: { userId, codeHash: await bcrypt.hash(codePlain, 10) },
      });
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: this.encryption.encrypt(secret),
        twoFactorEnabled: true,
      },
    });

    const tokens = await this.issueTokens(updatedUser, ip, userAgent);
    return { ...tokens, backupCodes };
  }

  async setup2fa(userId: string) {
    const secret = speakeasy.generateSecret({ name: 'TechPotli Business OS' });
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);
    await this.redis.set(`2fa:setup:${userId}`, secret.base32, 600);
    return { secret: secret.base32, qrCode };
  }

  async confirm2fa(userId: string, code: string) {
    const secret = await this.redis.get(`2fa:setup:${userId}`);
    if (!secret) throw new BadRequestException('Setup expired. Start again.');
    const ok = speakeasy.totp.verify({ secret, encoding: 'base32', token: code, window: 1 });
    if (!ok) throw new BadRequestException('Invalid code');

    const backupCodes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const codePlain = uuidv4().slice(0, 8).toUpperCase();
      backupCodes.push(codePlain);
      await this.prisma.twoFactorBackupCode.create({
        data: { userId, codeHash: await bcrypt.hash(codePlain, 10) },
      });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: this.encryption.encrypt(secret),
        twoFactorEnabled: true,
      },
    });
    await this.redis.del(`2fa:setup:${userId}`);
    return { backupCodes };
  }

  async refresh(refreshToken: string, ip: string, userAgent: string): Promise<AuthResult> {
    if (!refreshToken) throw new UnauthorizedException('Invalid refresh token');

    const lookup = this.refreshLookup(refreshToken);
    const reuseUserId = await this.redis.get(`refresh:revoked:${lookup}`);
    if (reuseUserId) {
      const grace = await this.getRefreshGrace(lookup);
      if (grace) {
        const graceSession = await this.prisma.userSession.findUnique({
          where: { id: grace.sessionId },
          include: { user: true },
        });
        if (graceSession && graceSession.user.isActive && graceSession.expiresAt > new Date()) {
          const match = await bcrypt.compare(grace.refreshToken, graceSession.refreshTokenHash);
          if (match) {
            return this.tokensFromSession(graceSession.user, graceSession.id, grace.refreshToken);
          }
        }
      }
      await this.revokeAllSessionsForUser(reuseUserId);
      throw new UnauthorizedException('Session invalidated due to suspicious activity');
    }

    const session = await this.prisma.userSession.findUnique({
      where: { refreshTokenLookup: lookup },
      include: { user: true },
    });

    if (!session || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const match = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    if (!match || !session.user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.redis.set(`refresh:revoked:${lookup}`, session.userId, REFRESH_TTL);
    await this.prisma.userSession.delete({ where: { id: session.id } });
    await this.sessions.revokeSession(session.id, session.userId);

    const result = await this.issueTokens(session.user, ip, userAgent);
    if (result.refreshToken && result.sessionId) {
      await this.storeRefreshGrace(lookup, {
        sessionId: result.sessionId,
        refreshToken: result.refreshToken,
      });
    }
    return result;
  }

  async logout(userId: string, sessionId?: string) {
    if (sessionId) {
      const session = await this.prisma.userSession.findFirst({
        where: { id: sessionId, userId },
      });
      if (session) {
        await this.redis.set(`refresh:revoked:${session.refreshTokenLookup}`, userId, REFRESH_TTL);
      }
      await this.prisma.userSession.deleteMany({ where: { id: sessionId, userId } });
      await this.sessions.revokeSession(sessionId, userId);
    } else {
      const sessions = await this.prisma.userSession.findMany({ where: { userId } });
      for (const s of sessions) {
        await this.redis.set(`refresh:revoked:${s.refreshTokenLookup}`, userId, REFRESH_TTL);
      }
      await this.prisma.userSession.deleteMany({ where: { userId } });
      await this.sessions.revokeAllUserSessions(userId);
    }
    return { success: true };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash, mustChangePassword: false },
    });
    return { success: true };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: profileSelect,
    });
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  async updateProfile(userId: string, name: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { name: name.trim() },
      select: profileSelect,
    });
  }

  async getSessions(userId: string, currentSessionId?: string) {
    const sessions = await this.prisma.userSession.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        device: true,
        browser: true,
        ip: true,
        lastActiveAt: true,
        createdAt: true,
      },
      orderBy: { lastActiveAt: 'desc' },
    });
    return sessions.map((s) => ({ ...s, current: s.id === currentSessionId }));
  }

  private createFlowToken(userId: string, typ: '2fa-enroll' | '2fa-verify', expiresIn: string) {
    return this.jwt.sign({ sub: userId, typ }, { expiresIn });
  }

  private verifyFlowToken(token: string, typ: '2fa-enroll' | '2fa-verify'): string {
    try {
      const payload = this.jwt.verify(token) as { sub?: string; typ?: string };
      if (!payload.sub || payload.typ !== typ) {
        throw new UnauthorizedException('Session expired');
      }
      return payload.sub;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Session expired');
    }
  }

  private refreshLookup(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex').slice(0, 32);
  }

  private async storeRefreshGrace(
    oldLookup: string,
    data: { sessionId: string; refreshToken: string },
  ): Promise<void> {
    await this.redis.set(
      `refresh:grace:${oldLookup}`,
      JSON.stringify({ ...data, at: Date.now() }),
      REFRESH_GRACE_SECONDS,
    );
  }

  private async getRefreshGrace(
    oldLookup: string,
  ): Promise<{ sessionId: string; refreshToken: string; at: number } | null> {
    const raw = await this.redis.get(`refresh:grace:${oldLookup}`);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { sessionId: string; refreshToken: string; at: number };
      if (!parsed.sessionId || !parsed.refreshToken || !parsed.at) return null;
      if (Date.now() - parsed.at > REFRESH_GRACE_SECONDS * 1000) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private tokensFromSession(
    user: AuthUser,
    sessionId: string,
    refreshToken: string,
  ): AuthResult {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sid: sessionId,
    };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES') || '15m',
    });
    return {
      accessToken,
      refreshToken,
      sessionId,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  private async revokeAllSessionsForUser(userId: string) {
    const sessions = await this.prisma.userSession.findMany({ where: { userId } });
    for (const s of sessions) {
      await this.redis.set(`refresh:revoked:${s.refreshTokenLookup}`, userId, REFRESH_TTL);
    }
    await this.prisma.userSession.deleteMany({ where: { userId } });
    await this.sessions.revokeAllUserSessions(userId);
  }

  private async issueTokens(user: AuthUser, ip: string, userAgent: string): Promise<AuthResult> {
    const refreshToken = uuidv4();
    const refreshHash = await bcrypt.hash(refreshToken, 10);
    const refreshTokenLookup = this.refreshLookup(refreshToken);
    const { device, browser } = parseUserAgent(userAgent);
    const expiresAt = new Date(Date.now() + REFRESH_TTL * 1000);

    const session = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: refreshHash,
        refreshTokenLookup,
        device,
        browser,
        ip,
        userAgent,
        expiresAt,
      },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sid: session.id,
    };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES') || '15m',
    });

    await this.sessions.registerSession(session.id, user.id);
    await this.prisma.loginHistory.create({
      data: {
        userId: user.id,
        email: user.email,
        success: true,
        ip,
        device,
        browser,
        userAgent,
      },
    });

    return {
      accessToken,
      refreshToken,
      sessionId: session.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }
}
