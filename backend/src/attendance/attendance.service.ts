import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  list(userId?: string, from?: Date, to?: Date) {
    const where: { userId?: string; date?: { gte?: Date; lte?: Date } } = {};
    if (userId) where.userId = userId;
    if (from || to) where.date = { ...(from && { gte: from }), ...(to && { lte: to }) };
    return this.prisma.attendance.findMany({ where, orderBy: { date: 'desc' } });
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
