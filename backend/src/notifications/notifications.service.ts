import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { CacheService } from '../redis/cache.service';

type NotificationPayload = {
  type: string;
  title: string;
  message: string;
  link?: string;
  metadata?: object;
};

const DEFAULT_LIMIT = parseInt(process.env.DEFAULT_LIST_LIMIT || '20', 10);

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
    private cache: CacheService,
  ) {}

  private emit(userId: string, data: unknown) {
    this.gateway.emitToUser(userId, 'notification', data);
  }

  private async bumpUnreadCache(userId: string) {
    await this.cache.bumpNamespace(`notifications-unread:${userId}`);
  }

  async create(data: NotificationPayload & { userId: string }) {
    const notification = await this.prisma.notification.create({ data });
    this.emit(data.userId, notification);
    await this.bumpUnreadCache(data.userId);
    return notification;
  }

  async notifyMany(userIds: string[], payload: NotificationPayload) {
    if (!userIds.length) return { count: 0 };
    const result = await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({ ...payload, userId })),
    });
    for (const userId of userIds) {
      this.emit(userId, { ...payload, userId });
      await this.bumpUnreadCache(userId);
    }
    return result;
  }

  async list(
    userId: string,
    opts?: { unreadOnly?: boolean; limit?: number; cursor?: string; page?: number },
  ) {
    const limit = Math.min(opts?.limit ?? DEFAULT_LIMIT, 100);
    const page = Math.max(1, opts?.page ?? 1);
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(opts?.unreadOnly ? { isRead: false } : {}),
    };

    if (opts?.cursor) {
      const [createdAt, id] = opts.cursor.split('|');
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

    const skip = opts?.cursor ? 0 : (page - 1) * limit;
    const baseWhere = { userId, ...(opts?.unreadOnly ? { isRead: false } : {}) };

    const [totalCount, rows] = await Promise.all([
      this.prisma.notification.count({ where: baseWhere }),
      this.prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        skip,
      }),
    ]);

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const last = data[data.length - 1];
    const nextCursor = hasMore && last ? `${last.createdAt.toISOString()}|${last.id}` : null;

    return {
      data,
      totalCount,
      page,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      limit,
      nextCursor,
      hasMore,
    };
  }

  async markRead(userId: string, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    if (result.count) await this.bumpUnreadCache(userId);
    return result;
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    if (result.count) await this.bumpUnreadCache(userId);
    return result;
  }

  async unreadCount(userId: string) {
    const ns = await this.cache.namespaceVersion(`notifications-unread:${userId}`);
    const cacheKey = `notifications:unread:${userId}:${ns}`;
    return this.cache.wrap(cacheKey, 30, () =>
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    );
  }
}
