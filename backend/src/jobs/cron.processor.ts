import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { LeadStatus, PaymentStatus, QuotationStatus, RenewalStatus, WorkOrderStatus } from '@prisma/client';
import { SnapshotRefreshService } from '../reports/snapshot-refresh.service';
import { CustomerSummaryRefreshService } from '../customers/customer-summary-refresh.service';
import { SearchIndexService } from '../search/search-index.service';

@Processor('cron')
export class CronProcessor extends WorkerHost {
  private readonly logger = new Logger(CronProcessor.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private mail: MailService,
    private snapshots: SnapshotRefreshService,
    private customerSummaries: CustomerSummaryRefreshService,
    private searchIndex: SearchIndexService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'renewal-check':
        return this.renewalCheck();
      case 'payment-overdue-check':
        return this.paymentOverdueCheck();
      case 'lead-followup-reminder':
        return this.leadFollowupReminder();
      case 'eod-lead-update-reminder':
        return this.eodLeadReminder();
      case 'work-order-escalation':
        return this.workOrderEscalation();
      case 'quotation-expiry-check':
        return this.quotationExpiryCheck();
      case 'dashboard-snapshot':
        return this.snapshots.refreshAll();
      case 'customer-summary-refresh':
        return this.customerSummaries.refreshAll();
      case 'search-index-rebuild':
        return this.searchIndex.rebuildAll();
    }
  }

  private async renewalCheck() {
    const days = [30, 15, 7, 1];
    const admins = await this.getAdminIds();
    for (const d of days) {
      const target = new Date();
      target.setDate(target.getDate() + d);
      const renewals = await this.prisma.renewal.findMany({
        where: { renewalDate: { gte: new Date(target.setHours(0, 0, 0, 0)), lte: new Date(target.setHours(23, 59, 59, 999)) } },
      });
      for (const r of renewals) {
        await this.notifications.notifyMany(admins, {
          type: 'RENEWAL_DUE',
          title: `Renewal in ${d} days`,
          message: `Renewal due on ${r.renewalDate.toDateString()}`,
          link: `/renewals`,
        });
      }
    }
  }

  private async paymentOverdueCheck() {
    const overdue = await this.prisma.payment.findMany({ where: { status: PaymentStatus.OVERDUE } });
    const admins = await this.getAdminIds();
    if (overdue.length) {
      await this.notifications.notifyMany(admins, {
        type: 'PAYMENT_OVERDUE',
        title: 'Overdue payments',
        message: `${overdue.length} payment(s) overdue`,
        link: '/payments',
      });
    }
  }

  private async leadFollowupReminder() {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const leads = await this.prisma.lead.findMany({
      where: { followUpDate: { lte: today }, status: { notIn: [LeadStatus.WON, LeadStatus.LOST] }, assignedToId: { not: null } },
    });
    for (const lead of leads) {
      if (!lead.assignedToId) continue;
      await this.notifications.create({
        userId: lead.assignedToId,
        type: 'LEAD_FOLLOWUP',
        title: 'Follow-up due',
        message: `Follow up with ${lead.companyName} today`,
        link: `/leads/${lead.id}`,
      });
    }
  }

  private async eodLeadReminder() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const salesUsers = await this.prisma.user.findMany({
      where: { role: 'EMPLOYEE', isActive: true },
      select: { id: true },
    });
    for (const user of salesUsers) {
      const leads = await this.prisma.lead.findMany({
        where: { assignedToId: user.id, status: { notIn: [LeadStatus.WON, LeadStatus.LOST] } },
      });
      let missing = 0;
      for (const lead of leads) {
        const activity = await this.prisma.leadActivity.findFirst({
          where: { leadId: lead.id, userId: user.id, createdAt: { gte: start } },
        });
        if (!activity) missing++;
      }
      if (missing > 0) {
        await this.notifications.create({
          userId: user.id,
          type: 'EOD_LEAD',
          title: 'End of day reminder',
          message: `You have ${missing} lead(s) with no update today. Please log your progress.`,
          link: '/leads',
        });
        await this.mail.sendToUser(user.id, 'EOD Lead Reminder', `<p>You have ${missing} leads with no update today.</p>`);
      }
    }
  }

  private async workOrderEscalation() {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const pending = await this.prisma.workOrder.findMany({
      where: { status: WorkOrderStatus.PENDING, assignedAt: { lt: twoHoursAgo } },
      include: { project: true },
    });
    const superAdmins = await this.prisma.user.findMany({ where: { role: 'SUPER_ADMIN' }, select: { id: true } });
    for (const wo of pending) {
      for (const admin of superAdmins) {
        await this.notifications.create({
          userId: admin.id,
          type: 'WO_ESCALATION',
          title: 'Work order not accepted',
          message: `${wo.workOrderNumber} not accepted after 2 hours`,
          link: `/projects/${wo.projectId}`,
        });
      }
    }
  }

  private async quotationExpiryCheck() {
    await this.prisma.quotation.updateMany({
      where: { validUntil: { lt: new Date() }, status: { in: [QuotationStatus.DRAFT, QuotationStatus.SENT] } },
      data: { status: QuotationStatus.EXPIRED },
    });
  }

  private async getAdminIds() {
    const users = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }
}
