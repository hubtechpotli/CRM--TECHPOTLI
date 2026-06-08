import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

type NotificationPayload = {
  type: string;
  title: string;
  message: string;
  link?: string;
  metadata?: object;
};

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
  ) {}

  private emit(userId: string, data: unknown) {
    this.gateway.emitToUser(userId, 'notification', data);
  }

  async create(data: NotificationPayload & { userId: string }) {
    const notification = await this.prisma.notification.create({ data });
    this.emit(data.userId, notification);
    return notification;
  }

  async notifyMany(userIds: string[], payload: NotificationPayload) {
    if (!userIds.length) return { count: 0 };
    const result = await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({ ...payload, userId })),
    });
    for (const userId of userIds) {
      this.emit(userId, { ...payload, userId });
    }
    return result;
  }

  list(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }
}
