import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async list(
    userId?: string,
    from?: Date,
    to?: Date,
    opts?: { limit?: number; page?: number; cursor?: string },
  ) {
    const where: Prisma.AttendanceWhereInput = {};
    if (userId) where.userId = userId;
    if (from || to) {
      where.date = { ...(from && { gte: from }), ...(to && { lte: to }) };
    }

    if (!opts?.limit && !opts?.page && !opts?.cursor) {
      return this.prisma.attendance.findMany({ where, orderBy: { date: 'desc' } });
    }

    const limit = Math.min(opts?.limit ?? parseInt(process.env.DEFAULT_LIST_LIMIT || '20', 10), 100);
    const page = Math.max(1, opts?.page ?? 1);

    if (opts?.cursor) {
      const [createdAt, id] = opts.cursor.split('|');
      const cursorDate = new Date(createdAt);
      if (!Number.isNaN(cursorDate.getTime()) && id) {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          {
            OR: [{ date: { lt: cursorDate } }, { date: cursorDate, id: { lt: id } }],
          },
        ];
      }
    }

    const skip = opts?.cursor ? 0 : (page - 1) * limit;

    const countWhere: Prisma.AttendanceWhereInput = {};
    if (userId) countWhere.userId = userId;
    if (from || to) {
      countWhere.date = { ...(from && { gte: from }), ...(to && { lte: to }) };
    }

    const [totalCount, rows] = await Promise.all([
      this.prisma.attendance.count({ where: countWhere }),
      this.prisma.attendance.findMany({
        where,
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        skip,
      }),
    ]);

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const last = data[data.length - 1];
    const nextCursor = hasMore && last ? `${last.date.toISOString()}|${last.id}` : null;

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

  async clockIn(userId: string, meta?: { ip?: string; device?: string; browser?: string }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.prisma.attendance.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today, loginTime: new Date(), loginIP: meta?.ip, loginDevice: meta?.device, loginBrowser: meta?.browser },
      update: { loginTime: new Date(), loginIP: meta?.ip, loginDevice: meta?.device, loginBrowser: meta?.browser },
    });
  }

  async clockOut(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const record = await this.prisma.attendance.findUnique({ where: { userId_date: { userId, date: today } } });
    if (!record?.loginTime) return record;
    const logoutTime = new Date();
    const totalHours = (logoutTime.getTime() - record.loginTime.getTime()) / 3600000;
    return this.prisma.attendance.update({
      where: { userId_date: { userId, date: today } },
      data: { logoutTime, totalHours },
    });
  }
}
