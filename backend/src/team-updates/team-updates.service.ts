import { Injectable } from '@nestjs/common';
import { CustomerWorkItemStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../redis/cache.service';
import { createHash } from 'crypto';

const feedIncludeLight = {
  createdBy: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
  project: { select: { id: true, name: true } },
  customer: { select: { id: true, companyName: true, ownerName: true } },
  _count: { select: { updates: true } },
};

const feedIncludeFull = {
  ...feedIncludeLight,
  updates: {
    orderBy: { createdAt: 'asc' as const },
    include: { author: { select: { id: true, name: true } } },
  },
};

export type TeamFeedFilters = {
  status?: CustomerWorkItemStatus;
  mine?: boolean;
  unassigned?: boolean;
  openOnly?: boolean;
  limit?: number;
  page?: number;
  take?: number;
  skip?: number;
  cursor?: string;
  q?: string;
  from?: string;
  to?: string;
  createdById?: string;
  customerId?: string;
  projectId?: string;
  includeUpdates?: boolean;
};

export type PaginatedFeed = {
  data: unknown[];
  totalCount: number;
  page: number;
  totalPages: number;
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
};

@Injectable()
export class TeamUpdatesService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  private buildWhere(userId: string, filters?: TeamFeedFilters): Prisma.CustomerWorkItemWhereInput {
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

    if (filters?.createdById) where.createdById = filters.createdById;
    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.projectId) where.projectId = filters.projectId;

    if (filters?.from || filters?.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const q = filters?.q?.trim();
    if (q) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { customer: { companyName: { contains: q, mode: 'insensitive' } } },
            { customer: { ownerName: { contains: q, mode: 'insensitive' } } },
            { createdBy: { name: { contains: q, mode: 'insensitive' } } },
            { assignedTo: { name: { contains: q, mode: 'insensitive' } } },
            { project: { name: { contains: q, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    return where;
  }

  private cacheKey(userId: string, filters?: TeamFeedFilters): string {
    const ns = createHash('sha256')
      .update(JSON.stringify({ userId, ...filters }))
      .digest('hex')
      .slice(0, 16);
    return `team-updates:feed:${ns}`;
  }

  async feed(userId: string, filters?: TeamFeedFilters): Promise<PaginatedFeed> {
    const useCache = process.env.ENABLE_TEAM_FEED_CACHE !== 'false';
    const cacheEnabled = useCache && !filters?.includeUpdates;

    if (cacheEnabled) {
      const ns = await this.cache.namespaceVersion('team-updates');
      const key = `${this.cacheKey(userId, filters)}:${ns}`;
      const cached = await this.cache.get<PaginatedFeed>(key);
      if (cached) return cached;
      const result = await this.feedQuery(userId, filters);
      await this.cache.set(key, result, 120);
      return result;
    }

    return this.feedQuery(userId, filters);
  }

  private async feedQuery(userId: string, filters?: TeamFeedFilters): Promise<PaginatedFeed> {
    const where = this.buildWhere(userId, filters);

    const limit = Math.min(
      filters?.limit ?? filters?.take ?? parseInt(process.env.DEFAULT_LIST_LIMIT || '20', 10),
      100,
    );

    let page = filters?.page ?? 1;
    if (filters?.skip != null && filters.skip > 0 && !filters.page) {
      page = Math.floor(filters.skip / limit) + 1;
    }
    page = Math.max(1, page);

    const include = filters?.includeUpdates ? feedIncludeFull : feedIncludeLight;

    if (filters?.cursor) {
      const [createdAt, id] = filters.cursor.split('|');
      const cursorDate = new Date(createdAt);
      if (!Number.isNaN(cursorDate.getTime()) && id) {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          {
            OR: [
              { createdAt: { lt: cursorDate } },
              { createdAt: cursorDate, id: { lt: id } },
            ],
          },
        ];
      }
    }

    const skip = filters?.cursor ? 0 : (page - 1) * limit;

    const [totalCount, rows] = await Promise.all([
      this.prisma.customerWorkItem.count({ where }),
      this.prisma.customerWorkItem.findMany({
        where,
        include,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        skip,
      }),
    ]);

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const last = data[data.length - 1] as { id: string; createdAt: Date } | undefined;
    const nextCursor =
      hasMore && last ? `${last.createdAt.toISOString()}|${last.id}` : null;

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    return {
      data,
      totalCount,
      page: filters?.cursor ? page : page,
      totalPages,
      limit,
      nextCursor,
      hasMore,
    };
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

  async getWorkItemUpdates(customerId: string, itemId: string) {
    return this.prisma.customerWorkItemUpdate.findMany({
      where: { workItemId: itemId, workItem: { customerId, id: itemId } },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, name: true } } },
    });
  }
}
