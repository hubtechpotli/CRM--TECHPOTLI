import { Injectable } from '@nestjs/common';
import { LeadStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaReadService } from '../prisma/prisma-read.service';
import { CacheService } from '../redis/cache.service';
import { buildLeadWhere, isLeadAdmin } from '../leads/lead-access';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private prismaRead: PrismaReadService,
    private cache: CacheService,
  ) {}

  async dashboard() {
    const snapshot = await this.prisma.dashboardSnapshot.findUnique({
      where: { metricKey: 'dashboard.kpis' },
    });
    if (snapshot?.value) {
      const cached = snapshot.value as Record<string, unknown>;
      const age = Date.now() - new Date(String(cached.updatedAt || 0)).getTime();
      if (age < 60000) {
        return {
          leads: cached.leadCount,
          activeCustomers: cached.customerCount,
          activeProjects: await this.prismaRead.project.count({ where: { status: { not: 'COMPLETED' } } }),
          pendingInvoices: cached.pendingInvoices,
          totalRevenue: (await this.prismaRead.payment.aggregate({ _sum: { paidAmount: true }, where: { status: 'PAID' } }))._sum.paidAmount,
          openTickets: cached.openTickets,
          renewalsDue: await this.prismaRead.renewal.count({ where: { status: { in: ['DUE_SOON', 'OVERDUE'] } } }),
          source: 'cqrs',
        };
      }
    }

    return this.cache.wrap('reports:dashboard', 120, async () => {
      const [leads, customers, projects, invoices, payments, tickets, renewalsDue] = await Promise.all([
        this.prismaRead.lead.count(),
        this.prismaRead.customer.count({ where: { status: 'ACTIVE' } }),
        this.prismaRead.project.count({ where: { status: { not: 'COMPLETED' } } }),
        this.prismaRead.invoice.count({ where: { status: { in: ['SENT', 'OVERDUE'] } } }),
        this.prismaRead.payment.aggregate({ _sum: { paidAmount: true }, where: { status: 'PAID' } }),
        this.prismaRead.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
        this.prismaRead.renewal.count({ where: { status: { in: ['DUE_SOON', 'OVERDUE'] } } }),
      ]);
      return {
        leads,
        activeCustomers: customers,
        activeProjects: projects,
        pendingInvoices: invoices,
        totalRevenue: payments._sum.paidAmount,
        openTickets: tickets,
        renewalsDue,
        source: 'live',
      };
    });
  }

  async employeePerformance() {
    const users = await this.prisma.user.findMany({
      where: { role: { in: ['EMPLOYEE', 'ADMIN', 'SUPER_ADMIN'] }, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        _count: {
          select: {
            assignedLeads: true,
            assignedCustomers: true,
            designerProjects: true,
          },
        },
      },
    });
    const converted = await this.prisma.lead.groupBy({
      by: ['assignedToId'],
      where: { status: LeadStatus.WON, assignedToId: { not: null } },
      _count: { _all: true },
    });
    const convertedMap = new Map(converted.map((c) => [c.assignedToId!, c._count._all]));
    return users
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        leads: u._count.assignedLeads,
        customers: u._count.assignedCustomers,
        projects: u._count.designerProjects,
        convertedLeads: convertedMap.get(u.id) ?? 0,
      }))
      .sort((a, b) => b.convertedLeads - a.convertedLeads);
  }

  async mrr() {
    const services = await this.prisma.customerService.findMany({
      where: { isActive: true, monthlyAmount: { not: null } },
      select: { monthlyAmount: true },
    });
    const total = services.reduce((s, svc) => s + Number(svc.monthlyAmount ?? 0), 0);
    return { mrr: total, activeServices: services.length };
  }

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

  async crmInsights(userRole: string, userId: string) {
    const ns = await this.cache.namespaceVersion('crm-insights');
    const cacheKey = `reports:crm-insights:${ns}:${userRole}:${userId}`;
    return this.cache.wrap(cacheKey, 60, async () => {
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
        this.prismaRead.lead.count({
          where: { ...leadWhere, status: LeadStatus.WON },
        }),
        this.prismaRead.lead.count({
          where: {
            ...leadWhere,
            followUpDate: { gte: todayStart, lte: todayEnd },
            status: { notIn: [LeadStatus.WON, LeadStatus.LOST] },
          },
        }),
        this.prismaRead.payment.aggregate({
          _sum: { paidAmount: true },
          where: revenueWhere,
        }),
        this.prismaRead.payment.aggregate({
          _sum: { paidAmount: true },
          where: { ...revenueWhere, collectedAt: { gte: currentStart } },
        }),
        this.prismaRead.payment.aggregate({
          _sum: { paidAmount: true },
          where: { ...revenueWhere, collectedAt: { gte: previousStart, lt: currentStart } },
        }),
        this.prismaRead.lead.count({
          where: { ...leadWhere, createdAt: { gte: currentStart } },
        }),
        this.prismaRead.lead.count({
          where: { ...leadWhere, createdAt: { gte: previousStart, lt: currentStart } },
        }),
        this.prismaRead.lead.count({
          where: {
            ...leadWhere,
            status: LeadStatus.WON,
            updatedAt: { gte: currentStart },
          },
        }),
        this.prismaRead.lead.count({
          where: {
            ...leadWhere,
            status: LeadStatus.WON,
            updatedAt: { gte: previousStart, lt: currentStart },
          },
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
        this.prismaRead.lead.groupBy({
          by: ['source'],
          where: leadWhere,
          _count: { _all: true },
        }),
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
          GROUP BY 1
          ORDER BY 1`,
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

      const leadsBySourceRows = leadsBySource.map((r) => ({
        source: r.source,
        count: r._count._all,
      }));

      let topSalespeople: {
        id: string;
        name: string;
        leads: number;
        convertedLeads: number;
        progressPct: number;
      }[] = [];

      if (admin) {
        const perf = await this.employeePerformance();
        const maxConverted = Math.max(...perf.map((p) => p.convertedLeads), 1);
        topSalespeople = perf.slice(0, 5).map((p) => ({
          id: p.id,
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
    });
  }

  async profitLoss(months = 6) {
    const since = new Date();
    since.setMonth(since.getMonth() - months);
    const [payments, expenses] = await Promise.all([
      this.prisma.payment.findMany({
        where: { status: 'PAID', paidDate: { gte: since } },
        select: { paidAmount: true },
      }),
      this.prisma.expense.findMany({
        where: { status: 'APPROVED', date: { gte: since } },
        select: { amount: true },
      }),
    ]);
    const revenue = payments.reduce((s, p) => s + Number(p.paidAmount), 0);
    const expenseTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
    return {
      revenue,
      expenses: expenseTotal,
      profit: revenue - expenseTotal,
      periodMonths: months,
    };
  }

  async teamWork() {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const staleBefore = new Date();
    staleBefore.setDate(staleBefore.getDate() - 7);

    const [users, assignedCounts, inProgressCounts, completedCounts, overdueCounts, lastUpdates] =
      await Promise.all([
        this.prisma.user.findMany({
          where: { isActive: true, role: { in: ['EMPLOYEE', 'ADMIN', 'SUPER_ADMIN'] } },
          select: { id: true, name: true, email: true, role: true },
          orderBy: { name: 'asc' },
        }),
        this.prisma.customerWorkItem.groupBy({
          by: ['assignedToId'],
          where: { assignedToId: { not: null }, status: { in: ['OPEN', 'IN_PROGRESS'] } },
          _count: { _all: true },
        }),
        this.prisma.customerWorkItem.groupBy({
          by: ['assignedToId'],
          where: { assignedToId: { not: null }, status: 'IN_PROGRESS' },
          _count: { _all: true },
        }),
        this.prisma.customerWorkItem.groupBy({
          by: ['assignedToId'],
          where: {
            assignedToId: { not: null },
            status: 'COMPLETED',
            completedAt: { gte: since },
          },
          _count: { _all: true },
        }),
        this.prisma.customerWorkItem.groupBy({
          by: ['assignedToId'],
          where: {
            assignedToId: { not: null },
            status: { in: ['OPEN', 'IN_PROGRESS'] },
            dueDate: { lt: new Date() },
          },
          _count: { _all: true },
        }),
        this.prisma.customerWorkItemUpdate.groupBy({
          by: ['authorId'],
          _max: { createdAt: true },
        }),
      ]);

    const mapCount = (rows: { assignedToId: string | null; _count: { _all: number } }[]) =>
      new Map(rows.filter((r) => r.assignedToId).map((r) => [r.assignedToId!, r._count._all]));

    const assignedMap = mapCount(assignedCounts);
    const inProgressMap = mapCount(inProgressCounts);
    const completedMap = mapCount(completedCounts);
    const overdueMap = mapCount(overdueCounts);
    const lastActivityMap = new Map(lastUpdates.map((r) => [r.authorId, r._max.createdAt]));

    const completedItems = await this.prisma.customerWorkItem.findMany({
      where: { status: 'COMPLETED', completedAt: { gte: since }, assignedToId: { not: null } },
      select: { assignedToId: true, createdAt: true, completedAt: true },
    });
    const avgDaysMap = new Map<string, number[]>();
    for (const item of completedItems) {
      if (!item.assignedToId || !item.completedAt) continue;
      const days = (item.completedAt.getTime() - item.createdAt.getTime()) / 86400000;
      const list = avgDaysMap.get(item.assignedToId) ?? [];
      list.push(days);
      avgDaysMap.set(item.assignedToId, list);
    }

    const employees = users.map((u) => {
      const avgList = avgDaysMap.get(u.id) ?? [];
      const avgDaysToComplete =
        avgList.length > 0 ? Math.round((avgList.reduce((a, b) => a + b, 0) / avgList.length) * 10) / 10 : null;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        assigned: assignedMap.get(u.id) ?? 0,
        inProgress: inProgressMap.get(u.id) ?? 0,
        completed30d: completedMap.get(u.id) ?? 0,
        overdue: overdueMap.get(u.id) ?? 0,
        avgDaysToComplete,
        lastActivity: lastActivityMap.get(u.id) ?? null,
      };
    });

    const [unassignedOpen, staleItems] = await Promise.all([
      this.prisma.customerWorkItem.count({
        where: { assignedToId: null, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
      this.prisma.customerWorkItem.count({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          updatedAt: { lt: staleBefore },
        },
      }),
    ]);

    return {
      employees,
      summary: { unassignedOpen, staleItems },
    };
  }
}
