import { Injectable } from '@nestjs/common';
import { CustomerWorkItemStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const feedInclude = {
  createdBy: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
  project: { select: { id: true, name: true } },
  customer: { select: { id: true, companyName: true } },
  updates: {
    orderBy: { createdAt: 'asc' as const },
    include: { author: { select: { id: true, name: true } } },
  },
  _count: { select: { updates: true } },
};

@Injectable()
export class TeamUpdatesService {
  constructor(private prisma: PrismaService) {}

  async feed(
    userId: string,
    filters?: {
      status?: CustomerWorkItemStatus;
      mine?: boolean;
      unassigned?: boolean;
      openOnly?: boolean;
      take?: number;
      skip?: number;
    },
  ) {
    const where: Prisma.CustomerWorkItemWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    } else if (filters?.openOnly !== false) {
      where.status = { in: ['OPEN', 'IN_PROGRESS'] };
    }

    if (filters?.mine) {
      where.OR = [{ createdById: userId }, { assignedToId: userId }];
    }

    if (filters?.unassigned) {
      where.assignedToId = null;
      where.status = { in: ['OPEN', 'IN_PROGRESS'] };
    }

    const take = Math.min(filters?.take ?? 50, 100);
    const skip = filters?.skip ?? 0;

    return this.prisma.customerWorkItem.findMany({
      where,
      include: feedInclude,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
  }

  async summary(userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const openWhere: Prisma.CustomerWorkItemWhereInput = {
      status: { in: ['OPEN', 'IN_PROGRESS'] },
    };

    const [openTotal, assignedToMe, unassignedOpen, newToday] = await Promise.all([
      this.prisma.customerWorkItem.count({ where: openWhere }),
      this.prisma.customerWorkItem.count({
        where: { ...openWhere, assignedToId: userId },
      }),
      this.prisma.customerWorkItem.count({
        where: { ...openWhere, assignedToId: null },
      }),
      this.prisma.customerWorkItem.count({
        where: { createdAt: { gte: startOfDay } },
      }),
    ]);

    return { openTotal, assignedToMe, unassignedOpen, newToday };
  }
}
