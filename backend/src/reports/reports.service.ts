import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../redis/cache.service';
import { isLeadAdmin } from '../leads/lead-access';

const REPORT_CACHE_TTL = 300;

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  private todayDate() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  async dashboard() {
    const snapshot = await this.prisma.dashboardSnapshot.findUnique({
      where: { metricKey: 'dashboard.kpis' },
    });
    if (!snapshot?.value) {
      throw new ServiceUnavailableException(
        'Dashboard snapshot not ready. Run snapshot refresh job or wait for next BullMQ cycle.',
      );
    }

    const cached = snapshot.value as Record<string, unknown>;
    return {
      leads: cached.leadCount ?? 0,
      activeCustomers: cached.activeCustomers ?? cached.customerCount ?? 0,
      activeProjects: cached.activeProjects ?? 0,
      pendingInvoices: cached.pendingInvoices ?? 0,
      pendingPayments: cached.pendingPayments ?? 0,
      totalRevenue: cached.totalRevenue ?? 0,
      monthlyRevenue: cached.monthlyRevenue ?? 0,
      openTickets: cached.openTickets ?? 0,
      renewalsDue: cached.renewalsDue ?? 0,
      mrr: cached.mrr ?? 0,
      employeeCount: cached.employeeCount ?? 0,
      snapshotUpdatedAt: cached.updatedAt ?? snapshot.updatedAt.toISOString(),
      source: 'snapshot',
    };
  }

  async crmInsights(userRole: string, userId: string) {
    const snapshot = await this.prisma.dashboardSnapshot.findUnique({
      where: { metricKey: 'dashboard.crm-insights' },
    });
    if (!snapshot?.value) {
      throw new ServiceUnavailableException(
        'CRM insights snapshot not ready. Run snapshot refresh job or wait for next BullMQ cycle.',
      );
    }

    const cached = snapshot.value as {
      updatedAt?: string;
      admin?: unknown;
      byUser?: Record<string, unknown>;
    };

    const payload = isLeadAdmin(userRole)
      ? cached.admin ?? cached.byUser?.[userId]
      : cached.byUser?.[userId];

    if (!payload) {
      throw new ServiceUnavailableException('CRM insights snapshot missing for this user.');
    }

    return {
      ...(payload as object),
      snapshotUpdatedAt: cached.updatedAt ?? snapshot.updatedAt.toISOString(),
      source: 'snapshot',
    };
  }

  async employeePerformance() {
    const snapshotDate = this.todayDate();
    const rows = await this.prisma.employeePerformanceSnapshot.findMany({
      where: { snapshotDate },
      orderBy: { convertedLeads: 'desc' },
    });

    if (!rows.length) {
      const latest = await this.prisma.employeePerformanceSnapshot.findMany({
        orderBy: [{ snapshotDate: 'desc' }, { convertedLeads: 'desc' }],
        take: 50,
      });
      if (!latest.length) {
        throw new ServiceUnavailableException('Employee performance snapshot not ready.');
      }
      const latestDate = latest[0].snapshotDate;
      return latest
        .filter((r) => r.snapshotDate.getTime() === latestDate.getTime())
        .map((u) => ({
          id: u.userId,
          name: u.name,
          email: u.email,
          role: u.role,
          leads: u.leads,
          customers: u.customers,
          projects: u.projects,
          convertedLeads: u.convertedLeads,
        }));
    }

    return rows.map((u) => ({
      id: u.userId,
      name: u.name,
      email: u.email,
      role: u.role,
      leads: u.leads,
      customers: u.customers,
      projects: u.projects,
      convertedLeads: u.convertedLeads,
    }));
  }

  async mrr() {
    const snap = await this.prisma.mrrSnapshot.findFirst({
      orderBy: { snapshotDate: 'desc' },
    });
    if (!snap) {
      throw new ServiceUnavailableException('MRR snapshot not ready.');
    }
    return {
      mrr: Number(snap.mrr),
      activeServices: snap.activeServices,
      snapshotDate: snap.snapshotDate,
      source: 'snapshot',
    };
  }

  async profitLoss(months = 6) {
    const ns = await this.cache.namespaceVersion('profit-loss');
    return this.cache.wrap(`reports:profit-loss:${ns}:${months}`, REPORT_CACHE_TTL, async () => {
      const since = new Date();
      since.setMonth(since.getMonth() - months);
      const monthly = await this.prisma.monthlyRevenueSnapshot.findMany({
        where: {
          OR: Array.from({ length: months }, (_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            return { year: d.getFullYear(), month: d.getMonth() + 1 };
          }),
        },
      });
      const revenue = monthly.reduce((s, m) => s + Number(m.revenue), 0);
      const expenses = await this.prisma.expense.aggregate({
        _sum: { amount: true },
        where: { status: 'APPROVED', date: { gte: since } },
      });
      const expenseTotal = Number(expenses._sum.amount ?? 0);
      return {
        revenue,
        expenses: expenseTotal,
        profit: revenue - expenseTotal,
        periodMonths: months,
        source: 'snapshot',
      };
    });
  }

  async teamWork() {
    const ns = await this.cache.namespaceVersion('team-work');
    return this.cache.wrap(`reports:team-work:${ns}`, REPORT_CACHE_TTL, () => this.teamWorkFromSnapshots());
  }

  private async teamWorkFromSnapshots() {
    const employees = await this.employeePerformance();
    return {
      employees: employees.map((e) => ({
        id: e.id,
        name: e.name,
        email: e.email,
        role: e.role,
        assigned: e.leads,
        inProgress: 0,
        completed30d: e.convertedLeads,
        overdue: 0,
        avgDaysToComplete: null,
        lastActivity: null,
      })),
      summary: { unassignedOpen: 0, staleItems: 0 },
      source: 'snapshot',
    };
  }
}
