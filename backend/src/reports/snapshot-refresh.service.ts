import { Injectable, Logger } from '@nestjs/common';
import { LeadStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaReadService } from '../prisma/prisma-read.service';
import { buildLeadWhere, isLeadAdmin } from '../leads/lead-access';
import { CacheService } from '../redis/cache.service';

@Injectable()
export class SnapshotRefreshService {
  private readonly logger = new Logger(SnapshotRefreshService.name);

  constructor(
    private prisma: PrismaService,
    private prismaRead: PrismaReadService,
    private cache: CacheService,
  ) {}

  private pctChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private paymentRevenueWhere(userRole: string, userId: string): Prisma.PaymentWhereInput {
    const base: Prisma.PaymentWhereInput = { status: 'PAID' };
    if (isLeadAdmin(userRole)) return base;
    return {
      ...base,
      OR: [{ createdById: userId }, { customer: { assignedEmployeeId: userId } }],
    };
  }

  async refreshAll(): Promise<void> {
    this.logger.log('Refreshing analytics snapshots…');
    await this.refreshEmployeePerformance();
    await this.refreshMrrSnapshot();
    await this.refreshDailyRevenue();
    await this.refreshMonthlyRevenue();
    await this.refreshDashboardKpis();
    await this.refreshCrmInsightsSnapshots();
    await this.cache.bumpNamespace('crm-insights');
    await this.cache.bumpNamespace('employee-performance');
    await this.cache.bumpNamespace('mrr');
    this.logger.log('Analytics snapshots refreshed');
  }

  async refreshDashboardKpis() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      leadCount,
      customerCount,
      activeProjects,
      pendingInvoices,
      payments,
      monthlyPayments,
      openTickets,
      renewalsDue,
      mrrServices,
      employeeCount,
      pendingPayments,
    ] = await Promise.all([
      this.prisma.lead.count(),
      this.prisma.customer.count({ where: { status: 'ACTIVE' } }),
      this.prisma.project.count({ where: { status: { not: 'COMPLETED' } } }),
      this.prisma.invoice.count({ where: { status: { in: ['SENT', 'OVERDUE'] } } }),
      this.prisma.payment.aggregate({ _sum: { paidAmount: true }, where: { status: 'PAID' } }),
      this.prisma.payment.aggregate({
        _sum: { paidAmount: true },
        where: { status: 'PAID', collectedAt: { gte: monthStart } },
      }),
      this.prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      this.prisma.renewal.count({ where: { status: { in: ['DUE_SOON', 'OVERDUE'] } } }),
      this.prisma.customerService.findMany({
        where: { isActive: true, monthlyAmount: { not: null } },
        select: { monthlyAmount: true },
      }),
      this.prisma.user.count({ where: { isActive: true, role: { in: ['EMPLOYEE', 'ADMIN', 'SUPER_ADMIN'] } } }),
      this.prisma.payment.count({ where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } } }),
    ]);

    const mrr = mrrServices.reduce((s, svc) => s + Number(svc.monthlyAmount ?? 0), 0);
    const value = {
      updatedAt: now.toISOString(),
      leadCount,
      customerCount,
      activeCustomers: customerCount,
      activeProjects,
      pendingInvoices,
      pendingPayments,
      totalRevenue: Number(payments._sum.paidAmount ?? 0),
      monthlyRevenue: Number(monthlyPayments._sum.paidAmount ?? 0),
      openTickets,
      renewalsDue,
      mrr,
      activeServices: mrrServices.length,
      employeeCount,
    };

    await this.prisma.dashboardSnapshot.upsert({
      where: { metricKey: 'dashboard.kpis' },
      create: { metricKey: 'dashboard.kpis', value },
      update: { value },
    });
  }

  private async computeCrmInsights(userRole: string, userId: string) {
    const leadWhere = buildLeadWhere(userRole, userId);
    const admin = isLeadAdmin(userRole);
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() - 30);
    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - 30);
    const revenueWhere = this.paymentRevenueWhere(userRole, userId);

    const [
      totalLeads,
      convertedLeads,
      followUpsDueToday,
      revenueAgg,
      revenueCurrent,
      revenuePrevious,
      leadsCurrent,
      leadsPrevious,
      convertedCurrent,
      convertedPrevious,
      followUpsCurrent,
      followUpsPrevious,
      leadsBySource,
      recentLeads,
      trendLeads,
    ] = await Promise.all([
      this.prismaRead.lead.count({ where: leadWhere }),
      this.prismaRead.lead.count({ where: { ...leadWhere, status: LeadStatus.WON } }),
      this.prismaRead.lead.count({
        where: {
          ...leadWhere,
          followUpDate: { gte: todayStart, lte: todayEnd },
          status: { notIn: [LeadStatus.WON, LeadStatus.LOST] },
        },
      }),
      this.prismaRead.payment.aggregate({ _sum: { paidAmount: true }, where: revenueWhere }),
      this.prismaRead.payment.aggregate({
        _sum: { paidAmount: true },
        where: { ...revenueWhere, collectedAt: { gte: currentStart } },
      }),
      this.prismaRead.payment.aggregate({
        _sum: { paidAmount: true },
        where: { ...revenueWhere, collectedAt: { gte: previousStart, lt: currentStart } },
      }),
      this.prismaRead.lead.count({ where: { ...leadWhere, createdAt: { gte: currentStart } } }),
      this.prismaRead.lead.count({ where: { ...leadWhere, createdAt: { gte: previousStart, lt: currentStart } } }),
      this.prismaRead.lead.count({
        where: { ...leadWhere, status: LeadStatus.WON, updatedAt: { gte: currentStart } },
      }),
      this.prismaRead.lead.count({
        where: { ...leadWhere, status: LeadStatus.WON, updatedAt: { gte: previousStart, lt: currentStart } },
      }),
      this.prismaRead.lead.count({
        where: {
          ...leadWhere,
          followUpDate: { gte: currentStart, lte: now },
          status: { notIn: [LeadStatus.WON, LeadStatus.LOST] },
        },
      }),
      this.prismaRead.lead.count({
        where: {
          ...leadWhere,
          followUpDate: { gte: previousStart, lt: currentStart },
          status: { notIn: [LeadStatus.WON, LeadStatus.LOST] },
        },
      }),
      this.prismaRead.lead.groupBy({ by: ['source'], where: leadWhere, _count: { _all: true } }),
      this.prismaRead.lead.findMany({
        where: leadWhere,
        take: 6,
        orderBy: { updatedAt: 'desc' },
        include: {
          assignedTo: { select: { id: true, name: true } },
          activities: { take: 1, orderBy: { createdAt: 'desc' } },
        },
      }),
      this.prismaRead.$queryRaw<{ day: Date; count: bigint }[]>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
        FROM "Lead"
        WHERE "createdAt" >= ${currentStart}
        ${userRole === UserRole.EMPLOYEE && userId ? Prisma.sql`AND "assignedToId" = ${userId}` : Prisma.empty}
        GROUP BY 1 ORDER BY 1`,
    ]);

    const revenue = Number(revenueAgg._sum.paidAmount ?? 0);
    const revenueCurrentAmt = Number(revenueCurrent._sum.paidAmount ?? 0);
    const revenuePreviousAmt = Number(revenuePrevious._sum.paidAmount ?? 0);

    const dayMap = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dayMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const row of trendLeads) {
      const key = new Date(row.day).toISOString().slice(0, 10);
      if (dayMap.has(key)) dayMap.set(key, Number(row.count));
    }
    const leadsTrend = Array.from(dayMap.entries()).map(([date, count]) => ({ date, count }));
    const leadsBySourceRows = leadsBySource.map((r) => ({ source: r.source, count: r._count._all }));

    let topSalespeople: Array<{
      id: string;
      name: string;
      leads: number;
      convertedLeads: number;
      progressPct: number;
    }> = [];

    if (admin) {
      const perfRows = await this.prisma.employeePerformanceSnapshot.findMany({
        where: { snapshotDate: this.todayDate() },
        orderBy: { convertedLeads: 'desc' },
        take: 5,
      });
      const maxConverted = Math.max(...perfRows.map((p) => p.convertedLeads), 1);
      topSalespeople = perfRows.map((p) => ({
        id: p.userId,
        name: p.name,
        leads: p.leads,
        convertedLeads: p.convertedLeads,
        progressPct: Math.round((p.convertedLeads / maxConverted) * 100),
      }));
    }

    const sparkFromTrend = leadsTrend.slice(-7).map((d) => ({ v: d.count }));

    return {
      kpis: {
        totalLeads,
        convertedLeads,
        revenue,
        followUpsDueToday,
        trends: {
          totalLeadsPct: this.pctChange(leadsCurrent, leadsPrevious),
          convertedPct: this.pctChange(convertedCurrent, convertedPrevious),
          revenuePct: this.pctChange(revenueCurrentAmt, revenuePreviousAmt),
          followUpsPct: this.pctChange(followUpsCurrent, followUpsPrevious),
        },
      },
      leadsTrend,
      sparklines: {
        totalLeads: sparkFromTrend,
        converted: sparkFromTrend,
        revenue: sparkFromTrend,
        followUps: sparkFromTrend,
      },
      leadsBySource: leadsBySourceRows,
      recentLeads,
      topSalespeople,
    };
  }

  private todayDate() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  async refreshCrmInsightsSnapshots() {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, role: true },
    });

    const byUser: Record<string, unknown> = {};
    let adminPayload: unknown = null;

    for (const user of users) {
      const payload = await this.computeCrmInsights(user.role, user.id);
      byUser[user.id] = payload;
      if (isLeadAdmin(user.role) && !adminPayload) {
        adminPayload = payload;
      }
    }

    const value: Prisma.InputJsonValue = {
      updatedAt: new Date().toISOString(),
      admin: adminPayload as Prisma.InputJsonValue,
      byUser: byUser as Prisma.InputJsonObject,
    };

    await this.prisma.dashboardSnapshot.upsert({
      where: { metricKey: 'dashboard.crm-insights' },
      create: { metricKey: 'dashboard.crm-insights', value },
      update: { value },
    });
  }

  async refreshDailyRevenue() {
    const since = new Date();
    since.setDate(since.getDate() - 90);
    since.setHours(0, 0, 0, 0);

    const rows = await this.prisma.$queryRaw<
      Array<{ day: Date; revenue: Prisma.Decimal; payment_count: bigint }>
    >`
      SELECT date_trunc('day', COALESCE("collectedAt", "createdAt"))::date AS day,
             COALESCE(SUM("paidAmount"), 0) AS revenue,
             COUNT(*)::bigint AS payment_count
      FROM "Payment"
      WHERE status = 'PAID' AND COALESCE("collectedAt", "createdAt") >= ${since}
      GROUP BY 1 ORDER BY 1 DESC`;

    const now = new Date();
    for (const row of rows) {
      const date = new Date(row.day);
      await this.prisma.dailyRevenueSnapshot.upsert({
        where: { date },
        create: {
          date,
          revenue: row.revenue,
          paymentCount: Number(row.payment_count),
          updatedAt: now,
        },
        update: {
          revenue: row.revenue,
          paymentCount: Number(row.payment_count),
          updatedAt: now,
        },
      });
    }
  }

  async refreshMonthlyRevenue() {
    const rows = await this.prisma.$queryRaw<
      Array<{ year: number; month: number; revenue: Prisma.Decimal; payment_count: bigint }>
    >`
      SELECT EXTRACT(YEAR FROM COALESCE("collectedAt", "createdAt"))::int AS year,
             EXTRACT(MONTH FROM COALESCE("collectedAt", "createdAt"))::int AS month,
             COALESCE(SUM("paidAmount"), 0) AS revenue,
             COUNT(*)::bigint AS payment_count
      FROM "Payment"
      WHERE status = 'PAID'
      GROUP BY 1, 2 ORDER BY 1 DESC, 2 DESC`;

    const now = new Date();
    for (const row of rows) {
      await this.prisma.monthlyRevenueSnapshot.upsert({
        where: { year_month: { year: row.year, month: row.month } },
        create: {
          year: row.year,
          month: row.month,
          revenue: row.revenue,
          paymentCount: Number(row.payment_count),
          updatedAt: now,
        },
        update: {
          revenue: row.revenue,
          paymentCount: Number(row.payment_count),
          updatedAt: now,
        },
      });
    }
  }

  async refreshMrrSnapshot() {
    const services = await this.prisma.customerService.findMany({
      where: { isActive: true, monthlyAmount: { not: null } },
      select: { monthlyAmount: true },
    });
    const mrr = services.reduce((s, svc) => s + Number(svc.monthlyAmount ?? 0), 0);
    const snapshotDate = this.todayDate();

    await this.prisma.mrrSnapshot.upsert({
      where: { snapshotDate },
      create: {
        snapshotDate,
        mrr,
        activeServices: services.length,
        updatedAt: new Date(),
      },
      update: {
        mrr,
        activeServices: services.length,
        updatedAt: new Date(),
      },
    });
  }

  async refreshEmployeePerformance() {
    const users = await this.prisma.user.findMany({
      where: { role: { in: ['EMPLOYEE', 'ADMIN', 'SUPER_ADMIN'] }, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        _count: {
          select: { assignedLeads: true, assignedCustomers: true, designerProjects: true },
        },
      },
    });
    const converted = await this.prisma.lead.groupBy({
      by: ['assignedToId'],
      where: { status: LeadStatus.WON, assignedToId: { not: null } },
      _count: { _all: true },
    });
    const convertedMap = new Map(converted.map((c) => [c.assignedToId!, c._count._all]));
    const snapshotDate = this.todayDate();
    const now = new Date();

    for (const u of users) {
      await this.prisma.employeePerformanceSnapshot.upsert({
        where: { snapshotDate_userId: { snapshotDate, userId: u.id } },
        create: {
          snapshotDate,
          userId: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          leads: u._count.assignedLeads,
          customers: u._count.assignedCustomers,
          projects: u._count.designerProjects,
          convertedLeads: convertedMap.get(u.id) ?? 0,
          updatedAt: now,
        },
        update: {
          name: u.name,
          email: u.email,
          role: u.role,
          leads: u._count.assignedLeads,
          customers: u._count.assignedCustomers,
          projects: u._count.designerProjects,
          convertedLeads: convertedMap.get(u.id) ?? 0,
          updatedAt: now,
        },
      });
    }
  }
}
