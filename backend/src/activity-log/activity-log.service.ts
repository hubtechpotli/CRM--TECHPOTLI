import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityLogService {
  constructor(private prisma: PrismaService) {}

  log(data: {
    userId?: string;
    action: string;
    module: string;
    recordId?: string;
    oldValue?: object;
    newValue?: object;
    ip?: string;
    userAgent?: string;
  }) {
    return this.prisma.activityLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        module: data.module,
        recordId: data.recordId,
        oldValue: data.oldValue,
        newValue: data.newValue,
        ip: data.ip,
        userAgent: data.userAgent,
      },
    });
  }

  findByRecord(module: string, recordId: string) {
    return this.prisma.activityLog.findMany({
      where: { module, recordId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    });
  }

  findAll(filters?: {
    userId?: string;
    module?: string;
    action?: string;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.ActivityLogWhereInput = {};
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.module) where.module = filters.module;
    if (filters?.action) where.action = filters.action;

    return this.prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: filters?.skip ?? 0,
      take: Math.min(filters?.take ?? 50, 100),
      include: { user: { select: { id: true, name: true, email: true, avatar: true, role: true } } },
    });
  }

  count(filters?: { userId?: string; module?: string; action?: string }) {
    const where: Prisma.ActivityLogWhereInput = {};
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.module) where.module = filters.module;
    if (filters?.action) where.action = filters.action;
    return this.prisma.activityLog.count({ where });
  }
}
