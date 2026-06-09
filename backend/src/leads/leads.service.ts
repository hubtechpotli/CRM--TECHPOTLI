import { Injectable, NotFoundException } from '@nestjs/common';
import { LeadActivityType, LeadStatus, LeadPriority, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { QuotationsService, CreateQuotationInput } from '../quotations/quotations.service';
import { EventPublisherService } from '../events/event-publisher.service';
import { AsyncProcessingService } from '../ai/async-processing.service';
import {
  assertCanAssign,
  assertCanDelete,
  assertCanReadLead,
  assertCanWriteLead,
  buildLeadWhere,
  isLeadAdmin,
} from './lead-access';
import { CacheService } from '../redis/cache.service';

const leadListInclude = {
  assignedTo: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  activities: { take: 1, orderBy: { createdAt: 'desc' as const }, select: { createdAt: true } },
} as const;

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private mail: MailService,
    private activityLog: ActivityLogService,
    private quotations: QuotationsService,
    private events: EventPublisherService,
    private asyncProcessing: AsyncProcessingService,
    private cache: CacheService,
  ) {}

  private async invalidateKanbanCache() {
    await this.cache.bumpNamespace('leads-kanban');
  }

  async findAll(
    filters: { status?: LeadStatus; assignedToId?: string; page?: number; limit?: number },
    userRole: string,
    userId: string,
  ) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 50));
    const where = buildLeadWhere(userRole, userId, filters);

    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: leadListInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  findMy(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.prisma.lead.findMany({
      where: {
        assignedToId: userId,
        OR: [{ followUpDate: { lte: new Date() } }, { assignedAt: { gte: today } }],
        status: { notIn: [LeadStatus.WON, LeadStatus.LOST] },
      },
      orderBy: { followUpDate: 'asc' },
    });
  }

  async kanban(userRole: string, userId: string) {
    const ns = await this.cache.namespaceVersion('leads-kanban');
    const cacheKey = `leads:kanban:${ns}:${userRole}:${userId}`;
    return this.cache.wrap(cacheKey, 30, async () => {
      const where = buildLeadWhere(userRole, userId);
      const leads = await this.prisma.lead.findMany({
        where,
        include: { assignedTo: { select: { id: true, name: true } } },
        orderBy: { updatedAt: 'desc' },
      });
      const columns: Record<LeadStatus, typeof leads> = {} as Record<LeadStatus, typeof leads>;
      for (const status of Object.values(LeadStatus)) columns[status] = [];
      for (const lead of leads) columns[lead.status].push(lead);
      return columns;
    });
  }

  async teamSummary() {
    const activeStatuses = Object.values(LeadStatus).filter(
      (s) => s !== LeadStatus.WON && s !== LeadStatus.LOST,
    );

    const [grouped, users, overdueRows] = await Promise.all([
      this.prisma.lead.groupBy({
        by: ['assignedToId', 'status'],
        where: { assignedToId: { not: null }, status: { in: activeStatuses } },
        _count: { _all: true },
      }),
      this.prisma.user.findMany({
        where: { isActive: true, role: { in: [UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.SUPER_ADMIN] } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.lead.groupBy({
        by: ['assignedToId'],
        where: {
          assignedToId: { not: null },
          status: { in: activeStatuses },
          followUpDate: { lt: new Date() },
        },
        _count: { _all: true },
      }),
    ]);

    const overdueMap = new Map(overdueRows.map((r) => [r.assignedToId!, r._count._all]));

    const byUser = new Map<string, Record<string, number>>();
    for (const row of grouped) {
      if (!row.assignedToId) continue;
      const entry = byUser.get(row.assignedToId) ?? {};
      entry[row.status] = row._count._all;
      byUser.set(row.assignedToId, entry);
    }

    return users.map((u) => {
      const byStatus = byUser.get(u.id) ?? {};
      const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0);
      return {
        id: u.id,
        name: u.name,
        total,
        byStatus,
        overdueFollowUps: overdueMap.get(u.id) ?? 0,
      };
    });
  }

  async findOne(id: string, userRole: string, userId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true } },
        activities: { orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, name: true, avatar: true } } } },
        statusHistory: { orderBy: { createdAt: 'desc' }, include: { changedBy: { select: { name: true } } } },
        quotations: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    assertCanReadLead(lead, userRole, userId);
    return lead;
  }

  async createQuotation(
    leadId: string,
    data: Omit<CreateQuotationInput, 'leadId'>,
    createdById: string,
    userRole: string,
  ) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');
    assertCanWriteLead(lead, userRole, createdById);
    return this.quotations.create(
      {
        ...data,
        leadId,
        clientName: data.clientName ?? lead.companyName,
        clientEmail: data.clientEmail ?? lead.email ?? undefined,
      },
      createdById,
    );
  }

  async create(data: Prisma.LeadUncheckedCreateInput, createdById: string, userRole: string) {
    const creator = await this.prisma.user.findUnique({
      where: { id: createdById },
      select: { role: true },
    });

    const payload: Prisma.LeadUncheckedCreateInput = { ...data, createdById };

    if (creator?.role === UserRole.EMPLOYEE || userRole === UserRole.EMPLOYEE) {
      payload.assignedToId = createdById;
      payload.assignedAt = new Date();
      if (!payload.status || payload.status === LeadStatus.NEW) {
        payload.status = LeadStatus.ASSIGNED;
      }
    }

    const lead = await this.prisma.lead.create({ data: payload });
    await this.events.leadCreated(lead as unknown as Record<string, unknown>, createdById);
    await this.events.entityUpdated('lead', lead.id, lead as unknown as Record<string, unknown>);
    this.asyncProcessing.onLeadCreated(lead);
    await this.invalidateKanbanCache();
    return lead;
  }

  async update(id: string, data: Prisma.LeadUpdateInput, userId: string, userRole: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    assertCanWriteLead(lead, userRole, userId);

    if (!isLeadAdmin(userRole)) {
      delete (data as Prisma.LeadUncheckedUpdateInput).assignedToId;
      delete (data as Prisma.LeadUncheckedUpdateInput).assignedAt;
    }

    if (data.status && data.status !== lead.status) {
      await this.prisma.leadStatusHistory.create({
        data: {
          leadId: id,
          fromStatus: lead.status,
          toStatus: data.status as LeadStatus,
          changedById: userId,
        },
      });
      await this.activityLog.log({
        userId,
        action: 'LEAD_STATUS_CHANGED',
        module: 'lead',
        recordId: id,
        oldValue: { status: lead.status },
        newValue: { status: data.status },
      });
    }
    const updated = await this.prisma.lead.update({ where: { id }, data });
    await this.invalidateKanbanCache();
    return updated;
  }

  async remove(id: string, userRole: string, userId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    assertCanDelete(userRole);
    const deleted = await this.prisma.lead.delete({ where: { id } });
    await this.invalidateKanbanCache();
    return deleted;
  }

  async assign(
    id: string,
    assignedToId: string,
    adminId: string,
    userRole: string,
    opts?: { followUpDate?: Date; priority?: LeadPriority; remarks?: string },
  ) {
    assertCanAssign(userRole);
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    const newStatus = lead.status === LeadStatus.NEW ? LeadStatus.ASSIGNED : lead.status;

    const updated = await this.prisma.lead.update({
      where: { id },
      data: {
        assignedToId,
        assignedAt: new Date(),
        status: newStatus,
        followUpDate: opts?.followUpDate ?? lead.followUpDate,
        priority: opts?.priority ?? lead.priority,
        remarks: opts?.remarks ?? lead.remarks,
      },
    });

    await this.prisma.leadStatusHistory.create({
      data: { leadId: id, fromStatus: lead.status, toStatus: newStatus, changedById: adminId, reason: 'Assigned' },
    });

    const msg = `New lead assigned: ${lead.companyName} – call by ${updated.followUpDate?.toDateString() || 'ASAP'}`;
    await this.notifications.create({
      userId: assignedToId,
      type: 'LEAD_ASSIGNED',
      title: 'New lead assigned',
      message: msg,
      link: `/leads/${id}`,
    });
    await this.mail.sendToUser(assignedToId, 'New Lead Assigned', `<p>${msg}</p>`);
    await this.activityLog.log({ userId: adminId, action: 'LEAD_ASSIGNED', module: 'lead', recordId: id, newValue: { assignedToId } });
    await this.invalidateKanbanCache();

    return updated;
  }

  async logActivity(
    leadId: string,
    userId: string,
    userRole: string,
    data: Prisma.LeadActivityUncheckedCreateInput,
  ) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');
    assertCanWriteLead(lead, userRole, userId);

    const activity = await this.prisma.leadActivity.create({ data: { ...data, leadId, userId } });
    await this.activityLog.log({
      userId,
      action: 'LEAD_ACTIVITY_LOGGED',
      module: 'lead',
      recordId: leadId,
      newValue: { type: data.type, notes: data.notes },
    });
    const leadUpdate: Prisma.LeadUpdateInput = {};
    if (data.nextFollowUp) leadUpdate.followUpDate = data.nextFollowUp;
    if (data.type === LeadActivityType.CALL) {
      if (lead.status !== LeadStatus.WON && lead.status !== LeadStatus.LOST) {
        leadUpdate.status = LeadStatus.CONTACTED;
      }
    }
    if (Object.keys(leadUpdate).length) {
      await this.prisma.lead.update({ where: { id: leadId }, data: leadUpdate });
      await this.invalidateKanbanCache();
    }
    await this.events.leadActivityLogged(leadId, activity as unknown as Record<string, unknown>, userId);
    this.asyncProcessing.onLeadActivity(leadId);
    return activity;
  }

  async convertToCustomer(leadId: string, userId: string, userRole: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');
    assertCanWriteLead(lead, userRole, userId);

    const customer = await this.prisma.customer.create({
      data: {
        companyName: lead.companyName,
        ownerName: lead.contactName,
        email: lead.email,
        phone: lead.phone,
        convertedFromLeadId: leadId,
        createdById: userId,
        assignedEmployeeId: lead.assignedToId,
      },
    });
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { status: LeadStatus.WON, convertedToCustomerId: customer.id },
    });
    await this.activityLog.log({
      userId,
      action: 'LEAD_CONVERTED',
      module: 'lead',
      recordId: leadId,
      newValue: { customerId: customer.id },
    });
    await this.events.leadConverted(leadId, customer.id, userId);
    await this.events.entityUpdated('customer', customer.id, customer as unknown as Record<string, unknown>);
    this.asyncProcessing.onLeadConverted(customer);
    await this.invalidateKanbanCache();
    return customer;
  }
}
