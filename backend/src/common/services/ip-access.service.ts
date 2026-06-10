import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ipMatchesCidr, normalizeClientIp, parseEnvOfficeCidrs } from '../utils/ip.util';

type LoginUser = {
  id: string;
  allowRemoteAccess: boolean;
  allowedIPs: string[];
};

@Injectable()
export class IpAccessService {
  constructor(private prisma: PrismaService) {}

  async assertLoginAllowed(user: LoginUser, ip: string) {
    if (user.allowRemoteAccess) return;

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
        `Login is only allowed from the office network. Ask your admin to enable "Work from home" on your employee profile, or add your IP (${normalizedIp}) under Settings → Allowed IPs.`,
      );
    }
  }
}
