import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ipMatchesCidr, normalizeClientIp, parseEnvOfficeCidrs } from '../utils/ip.util';

type LoginUser = {
  id: string;
  allowRemoteAccess: boolean;
  twoFactorEnabled: boolean;
  allowedIPs: string[];
};

@Injectable()
export class IpAccessService {
  constructor(private prisma: PrismaService) {}

  async assertLoginAllowed(user: LoginUser, ip: string) {
    if (user.allowRemoteAccess && user.twoFactorEnabled) return;

    const office = await this.prisma.allowedOfficeIp.findMany({
      where: { isActive: true },
      select: { cidr: true },
    });
    const cidrs = [
      ...parseEnvOfficeCidrs(),
      ...office.map((o) => o.cidr),
      ...(user.allowedIPs || []),
    ];
    if (cidrs.length === 0) return;

    const normalizedIp = normalizeClientIp(ip);
    const ok = cidrs.some((c) => ipMatchesCidr(normalizedIp, c));
    if (!ok) {
      throw new ForbiddenException(
        `Login is only allowed from the office network. Contact your admin for remote access. (Your IP: ${normalizedIp})`,
      );
    }
  }
}
