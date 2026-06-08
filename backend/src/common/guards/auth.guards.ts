import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY, ROLES_KEY, SKIP_IP_KEY } from '../decorators/metadata.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const request = context.switchToHttp().getRequest();
    return !!request.user;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;
    const { user } = context.switchToHttp().getRequest();
    if (!user || !roles.includes(user.role as UserRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}

@Injectable()
export class IpWhitelistGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const skipIp = this.reflector.getAllAndOverride<boolean>(SKIP_IP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic || skipIp) return true;

    const request = context.switchToHttp().getRequest();
    const ip =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      '127.0.0.1';

    const { ipMatchesCidr } = await import('../utils/ip.util');
    const allowed = await this.prisma.allowedOfficeIp.findMany({ where: { isActive: true } });
    const userAllowed = request.user?.allowedIPs as string[] | undefined;

    const cidrs = [...allowed.map((a) => a.cidr), ...(userAllowed || [])];
    if (cidrs.length === 0) return true;

    const ok = cidrs.some((c) => ipMatchesCidr(ip, c));
    if (!ok) {
      await this.prisma.blockedAccessLog.create({
        data: {
          ip,
          userId: request.user?.sub,
          userAgent: request.headers['user-agent'],
          path: request.url,
        },
      });
      throw new ForbiddenException('Access only from office network');
    }
    return true;
  }
}
