import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomerSummaryRefreshService {
  private readonly logger = new Logger(CustomerSummaryRefreshService.name);

  constructor(private prisma: PrismaService) {}

  async refreshAll(): Promise<void> {
    const customers = await this.prisma.customer.findMany({ select: { id: true } });
    for (const c of customers) {
      await this.refreshOne(c.id);
    }
    this.logger.log(`Customer summaries refreshed (${customers.length})`);
  }

  async refreshOne(customerId: string): Promise<void> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, companyName: true },
    });
    if (!customer) {
      await this.prisma.customerSummary.deleteMany({ where: { customerId } });
      return;
    }

    const [projectCount, invoiceCount, renewalCount, openTasks, pendingAgg, lastTimeline, lastWorkItem] =
      await Promise.all([
        this.prisma.project.count({ where: { customerId } }),
        this.prisma.invoice.count({ where: { customerId } }),
        this.prisma.renewal.count({ where: { customerId, status: { in: ['DUE_SOON', 'OVERDUE'] } } }),
        this.prisma.customerWorkItem.count({
          where: { customerId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
        }),
        this.prisma.payment.aggregate({
          where: {
            customerId,
            status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] },
            pendingAmount: { gt: 0 },
          },
          _sum: { pendingAmount: true },
        }),
        this.prisma.customerTimelineEvent.findFirst({
          where: { customerId },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
        this.prisma.customerWorkItem.findFirst({
          where: { customerId },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true },
        }),
      ]);

    const lastActivityAt = [lastTimeline?.createdAt, lastWorkItem?.updatedAt]
      .filter(Boolean)
      .sort((a, b) => (b!.getTime() - a!.getTime()))[0] ?? null;

    const pendingAmount = Number(pendingAgg._sum.pendingAmount ?? 0);
    const now = new Date();

    await this.prisma.customerSummary.upsert({
      where: { customerId },
      create: {
        customerId,
        companyName: customer.companyName,
        projectCount,
        invoiceCount,
        pendingAmount,
        lastActivityAt,
        renewalCount,
        openTasks,
        updatedAt: now,
      },
      update: {
        companyName: customer.companyName,
        projectCount,
        invoiceCount,
        pendingAmount,
        lastActivityAt,
        renewalCount,
        openTasks,
        updatedAt: now,
      },
    });
  }
}
