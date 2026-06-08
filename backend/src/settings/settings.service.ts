import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  getSettings() {
    return this.prisma.systemSettings.findUnique({ where: { id: 'default' } });
  }

  updateSettings(data: Prisma.SystemSettingsUpdateInput) {
    return this.prisma.systemSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...(data as Prisma.SystemSettingsCreateInput) },
      update: data,
    });
  }

  listAllowedIps() {
    return this.prisma.allowedOfficeIp.findMany({ orderBy: { createdAt: 'desc' } });
  }

  createAllowedIp(data: Prisma.AllowedOfficeIpCreateInput) {
    return this.prisma.allowedOfficeIp.create({ data });
  }

  updateAllowedIp(id: string, data: Prisma.AllowedOfficeIpUpdateInput) {
    return this.prisma.allowedOfficeIp.update({ where: { id }, data });
  }

  removeAllowedIp(id: string) {
    return this.prisma.allowedOfficeIp.delete({ where: { id } });
  }
}
