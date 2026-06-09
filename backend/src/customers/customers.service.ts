import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CustomerStatus,
  CustomerWorkItemCategory,
  CustomerWorkItemStatus,
  DocumentStatus,
  DocumentType,
  Prisma,
  ServiceType,
  TimelineEventType,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import {
  buildCustomerNoticeHtml,
  CUSTOMER_NOTIFY_TEMPLATES,
  CustomerEmailReason,
  getCustomerNoticeSubject,
} from '../mail/templates/customer-notice.template';
import { SendCustomerEmailDto } from './dto/send-customer-email.dto';
import { CacheService } from '../redis/cache.service';

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
    private activityLog: ActivityLogService,
    private mail: MailService,
    private notifications: NotificationsService,
    private gateway: NotificationsGateway,
    private cache: CacheService,
  ) {}

  private workItemInclude = {
    createdBy: { select: { id: true, name: true } },
    assignedTo: { select: { id: true, name: true } },
    project: { select: { id: true, name: true } },
    updates: {
      take: 5,
      orderBy: { createdAt: 'desc' as const },
      include: { author: { select: { id: true, name: true } } },
    },
  };

  private async invalidateDirectoryCache() {
    await this.cache.bumpNamespace('customers-directory');
  }

  findAll() {
    return this.prisma.customer.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async directory(
    filters?: { status?: CustomerStatus; state?: string; q?: string; assignedEmployeeId?: string },
    page = 1,
    limit = 50,
  ) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(500, Math.max(1, limit));
    const ns = await this.cache.namespaceVersion('customers-directory');
    const cacheKey = `customers:directory:${ns}:${JSON.stringify(filters ?? {})}:${safePage}:${safeLimit}`;

    return this.cache.wrap(cacheKey, 60, async () => {
      const where: Prisma.CustomerWhereInput = {};
      if (filters?.status) where.status = filters.status;
      if (filters?.state) where.state = filters.state;
      if (filters?.assignedEmployeeId) where.assignedEmployeeId = filters.assignedEmployeeId;
      if (filters?.q) {
        where.OR = [
          { companyName: { contains: filters.q, mode: 'insensitive' } },
          { ownerName: { contains: filters.q, mode: 'insensitive' } },
          { phone: { contains: filters.q } },
          { email: { contains: filters.q, mode: 'insensitive' } },
        ];
      }

      const [rows, total] = await Promise.all([
        this.prisma.customer.findMany({
          where,
          orderBy: { createdAt: 'asc' },
          skip: (safePage - 1) * safeLimit,
          take: safeLimit,
          include: {
            assignedEmployee: { select: { id: true, name: true } },
            _count: {
              select: {
                workItems: { where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } },
              },
            },
          },
        }),
        this.prisma.customer.count({ where }),
      ]);

      return {
        items: rows.map(({ _count, ...row }) => ({
          ...row,
          openWorkItemCount: _count.workItems,
        })),
        total,
        page: safePage,
        limit: safeLimit,
      };
    });
  }

  findOne(id: string) {
    return this.prisma.customer.findUnique({
      where: { id },
      include: { services: true, assignedEmployee: { select: { id: true, name: true } } },
    });
  }

  async create(data: Prisma.CustomerCreateInput, createdById: string) {
    const customer = await this.prisma.customer.create({
      data: { ...data, createdBy: { connect: { id: createdById } } },
    });
    await this.appendTimelineEvent(customer.id, {
      eventType: 'CUSTOMER_CREATED',
      title: 'Customer created',
      description: customer.companyName,
      userId: createdById,
    });
    await this.invalidateDirectoryCache();
    return customer;
  }

  async update(id: string, data: Prisma.CustomerUpdateInput) {
    const customer = await this.prisma.customer.update({ where: { id }, data });
    await this.invalidateDirectoryCache();
    return customer;
  }

  async remove(id: string) {
    const customer = await this.prisma.customer.delete({ where: { id } });
    await this.invalidateDirectoryCache();
    return customer;
  }

  async toggleFavorite(userId: string, customerId: string) {
    const existing = await this.prisma.customerFavorite.findUnique({ where: { userId_customerId: { userId, customerId } } });
    if (existing) {
      await this.prisma.customerFavorite.delete({ where: { userId_customerId: { userId, customerId } } });
      return { favorited: false };
    }
    await this.prisma.customerFavorite.create({ data: { userId, customerId } });
    return { favorited: true };
  }

  listFavorites(userId: string) {
    return this.prisma.customerFavorite.findMany({
      where: { userId },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async trackRecentlyViewed(userId: string, customerId: string) {
    try {
      await this.prisma.customerRecentlyViewed.upsert({
        where: { userId_customerId: { userId, customerId } },
        create: { userId, customerId },
        update: { viewedAt: new Date() },
      });
    } catch {
      // Non-fatal: recently viewed is best-effort
    }
    return { ok: true };
  }

  listRecentlyViewed(userId: string) {
    return this.prisma.customerRecentlyViewed.findMany({
      where: { userId },
      include: { customer: true },
      orderBy: { viewedAt: 'desc' },
      take: 20,
    });
  }

  listCallLogs(customerId: string) {
    return this.prisma.customerCallLog.findMany({
      where: { customerId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { callDate: 'desc' },
    });
  }

  async addCallLog(customerId: string, userId: string, data: { notes: string; followUpDate?: Date }) {
    const log = await this.prisma.customerCallLog.create({ data: { customerId, userId, ...data } });
    await this.appendTimelineEvent(customerId, {
      eventType: 'CALL_LOGGED',
      title: 'Call logged',
      description: data.notes,
      userId,
      metadata: { callLogId: log.id },
    });
    return log;
  }

  listInternalNotes(customerId: string) {
    return this.prisma.customerInternalNote.findMany({
      where: { customerId },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addInternalNote(customerId: string, authorId: string, content: string) {
    const trimmed = content?.trim();
    if (!trimmed) throw new BadRequestException('Note content is required');
    const note = await this.prisma.customerInternalNote.create({
      data: { customerId, authorId, content: trimmed },
      include: { author: { select: { id: true, name: true } } },
    });
    await this.appendTimelineEvent(customerId, {
      eventType: 'NOTE_ADDED',
      title: 'Note added',
      description: trimmed,
      userId: authorId,
      metadata: { noteId: note.id },
    });
    return note;
  }

  getTimeline(customerId: string) {
    return this.prisma.customerTimelineEvent.findMany({
      where: { customerId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  listWorkItems(customerId: string, filters?: { status?: CustomerWorkItemStatus; mine?: string }) {
    const where: Prisma.CustomerWorkItemWhereInput = { customerId };
    if (filters?.status) where.status = filters.status;
    if (filters?.mine) where.OR = [{ createdById: filters.mine }, { assignedToId: filters.mine }];
    return this.prisma.customerWorkItem.findMany({
      where,
      include: this.workItemInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createWorkItem(
    customerId: string,
    userId: string,
    data: {
      title: string;
      description?: string;
      category?: CustomerWorkItemCategory;
      assignedToId?: string;
      projectId?: string;
      dueDate?: Date;
    },
  ) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');
    const title = data.title?.trim();
    if (!title) throw new BadRequestException('Title is required');

    const item = await this.prisma.customerWorkItem.create({
      data: {
        customerId,
        title,
        description: data.description?.trim() || undefined,
        category: data.category ?? 'GENERAL',
        createdById: userId,
        assignedToId: data.assignedToId || undefined,
        projectId: data.projectId || undefined,
        dueDate: data.dueDate,
      },
      include: this.workItemInclude,
    });

    await this.appendTimelineEvent(customerId, {
      eventType: 'WORK_ITEM_CREATED',
      title: `Work item: ${title}`,
      description: data.description?.trim() || undefined,
      userId,
      metadata: { workItemId: item.id, category: item.category, assignedToId: item.assignedToId },
    });

    await this.notifyWorkItemAssignment(item, userId, 'created');
    await this.broadcastWorkItem(item, customer.companyName);
    return item;
  }

  async updateWorkItemStatus(
    customerId: string,
    itemId: string,
    userId: string,
    userRole: UserRole,
    status: CustomerWorkItemStatus,
    note?: string,
  ) {
    const item = await this.prisma.customerWorkItem.findFirst({ where: { id: itemId, customerId } });
    if (!item) throw new NotFoundException('Work item not found');
    this.assertCanManageWorkItem(item, userId, userRole);

    const fromStatus = item.status;
    const completedAt = status === 'COMPLETED' ? new Date() : status === 'OPEN' || status === 'IN_PROGRESS' ? null : item.completedAt;

    const updated = await this.prisma.$transaction(async (tx) => {
      const workItem = await tx.customerWorkItem.update({
        where: { id: itemId },
        data: { status, completedAt: completedAt ?? undefined },
        include: this.workItemInclude,
      });
      if (note?.trim()) {
        await tx.customerWorkItemUpdate.create({
          data: {
            workItemId: itemId,
            authorId: userId,
            body: note.trim(),
            fromStatus,
            toStatus: status,
          },
        });
      } else if (fromStatus !== status) {
        await tx.customerWorkItemUpdate.create({
          data: {
            workItemId: itemId,
            authorId: userId,
            body: `Status changed from ${fromStatus} to ${status}`,
            fromStatus,
            toStatus: status,
          },
        });
      }
      return tx.customerWorkItem.findUnique({
        where: { id: itemId },
        include: this.workItemInclude,
      });
    });

    const eventType: TimelineEventType =
      status === 'COMPLETED' ? 'WORK_ITEM_COMPLETED' : 'WORK_ITEM_UPDATED';
    await this.appendTimelineEvent(customerId, {
      eventType,
      title: status === 'COMPLETED' ? `Completed: ${item.title}` : `Updated: ${item.title}`,
      description: note?.trim() || `Status: ${status}`,
      userId,
      metadata: { workItemId: itemId, fromStatus, toStatus: status },
    });

    if (updated) {
      await this.notifyWorkItemAssignment(updated, userId, 'updated');
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
        select: { companyName: true },
      });
      await this.broadcastWorkItem(updated, customer?.companyName ?? 'Customer');
    }
    return updated;
  }

  async addWorkItemUpdate(
    customerId: string,
    itemId: string,
    userId: string,
    body: string,
    toStatus?: CustomerWorkItemStatus,
  ) {
    const item = await this.prisma.customerWorkItem.findFirst({ where: { id: itemId, customerId } });
    if (!item) throw new NotFoundException('Work item not found');
    const trimmed = body?.trim();
    if (!trimmed) throw new BadRequestException('Update text is required');

    const fromStatus = item.status;
    const data: Prisma.CustomerWorkItemUpdateUncheckedCreateInput = {
      workItemId: itemId,
      authorId: userId,
      body: trimmed,
      fromStatus: toStatus && toStatus !== fromStatus ? fromStatus : undefined,
      toStatus: toStatus && toStatus !== fromStatus ? toStatus : undefined,
    };

    await this.prisma.customerWorkItemUpdate.create({ data });

    let updated = item;
    if (toStatus && toStatus !== fromStatus) {
      updated = await this.prisma.customerWorkItem.update({
        where: { id: itemId },
        data: {
          status: toStatus,
          completedAt: toStatus === 'COMPLETED' ? new Date() : undefined,
        },
      });
    }

    await this.appendTimelineEvent(customerId, {
      eventType: toStatus === 'COMPLETED' ? 'WORK_ITEM_COMPLETED' : 'WORK_ITEM_UPDATED',
      title: `Update on: ${item.title}`,
      description: trimmed,
      userId,
      metadata: { workItemId: itemId, toStatus },
    });

    const result = await this.prisma.customerWorkItem.findUnique({
      where: { id: itemId },
      include: this.workItemInclude,
    });
    if (result) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
        select: { companyName: true },
      });
      await this.broadcastWorkItem(result, customer?.companyName ?? 'Customer');
    }
    return result;
  }

  private assertCanManageWorkItem(
    item: { createdById: string; assignedToId: string | null },
    userId: string,
    userRole: UserRole,
  ) {
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    const isOwner = item.createdById === userId || item.assignedToId === userId;
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('You can only update work items you created or are assigned to');
    }
  }

  private async appendTimelineEvent(
    customerId: string,
    data: {
      eventType: TimelineEventType;
      title: string;
      description?: string;
      userId?: string;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    await this.prisma.customerTimelineEvent.create({
      data: {
        customerId,
        eventType: data.eventType,
        title: data.title,
        description: data.description,
        userId: data.userId,
        metadata: data.metadata,
      },
    });
  }

  private async broadcastWorkItem(
    item: {
      id: string;
      title: string;
      customerId: string;
      status: string;
      createdBy: { id?: string; name: string };
      assignedTo?: { id?: string; name?: string } | null;
      project?: { id?: string; name?: string } | null;
    },
    customerName: string,
  ) {
    this.gateway.emitToRoom('team', 'work_item:new', {
      id: item.id,
      title: item.title,
      customerId: item.customerId,
      customerName,
      projectId: item.project?.id ?? null,
      projectName: item.project?.name ?? null,
      status: item.status,
      createdBy: item.createdBy,
      assignedTo: item.assignedTo ?? null,
    });
  }

  private async notifyWorkItemAssignment(
    item: {
      id: string;
      title: string;
      customerId: string;
      assignedToId: string | null;
      createdBy: { name: string };
    },
    actorId: string,
    action: 'created' | 'updated',
  ) {
    if (item.assignedToId && item.assignedToId !== actorId) {
      await this.notifications.create({
        userId: item.assignedToId,
        type: 'WORK_ITEM_ASSIGNED',
        title: action === 'created' ? 'New work assigned' : 'Work item updated',
        message: `${item.createdBy.name}: ${item.title}`,
        link: `/customers/${item.customerId}?tab=teamWork`,
      });
      return;
    }

    if (!item.assignedToId && action === 'created') {
      const staff = await this.prisma.user.findMany({
        where: { isActive: true, id: { not: actorId } },
        select: { id: true },
      });
      if (staff.length) {
        await this.notifications.notifyMany(
          staff.map((s) => s.id),
          {
            type: 'WORK_ITEM_BROADCAST',
            title: 'New team update',
            message: `${item.createdBy.name}: ${item.title}`,
            link: `/customers/${item.customerId}?tab=teamWork`,
          },
        );
      }
    }
  }

  async recalcBusinessScore(customerId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');
    const [payments, projects] = await Promise.all([
      this.prisma.payment.count({ where: { customerId, status: 'PAID' } }),
      this.prisma.project.count({ where: { customerId, status: 'COMPLETED' } }),
    ]);
    const score = Math.min(100, payments * 10 + projects * 15);
    return this.prisma.customer.update({ where: { id: customerId }, data: { businessScore: score } });
  }

  listDocuments(customerId: string) {
    return this.prisma.customerDocument.findMany({ where: { customerId }, orderBy: { createdAt: 'desc' } });
  }

  async createDocument(
    customerId: string,
    userId: string,
    data: {
      documentType: DocumentType;
      filename: string;
      s3Key: string;
      mimeType: string;
      fileSizeBytes: number;
      customName?: string;
    },
  ) {
    const doc = await this.prisma.customerDocument.create({
      data: {
        customerId,
        documentType: data.documentType,
        filename: data.filename,
        s3Key: data.s3Key,
        mimeType: data.mimeType,
        fileSizeBytes: data.fileSizeBytes,
        customName: data.customName,
        uploadedById: userId,
      },
    });
    await this.prisma.customerTimelineEvent.create({
      data: {
        customerId,
        eventType: 'DOCUMENT_UPLOADED',
        title: 'Document uploaded',
        description: data.customName ?? data.filename,
        userId,
        metadata: { documentId: doc.id, documentType: data.documentType },
      },
    });
    return doc;
  }

  async verifyDocument(
    customerId: string,
    docId: string,
    userId: string,
    status: Extract<DocumentStatus, 'VERIFIED' | 'REJECTED'>,
    rejectionReason?: string,
  ) {
    const doc = await this.prisma.customerDocument.findFirst({ where: { id: docId, customerId } });
    if (!doc) throw new NotFoundException('Document not found');
    if (status === 'REJECTED' && !rejectionReason) {
      throw new BadRequestException('Rejection reason is required when rejecting a document');
    }
    return this.prisma.customerDocument.update({
      where: { id: docId },
      data: {
        status,
        verifiedById: userId,
        verifiedAt: new Date(),
        rejectionReason: status === 'REJECTED' ? rejectionReason : null,
      },
    });
  }

  listDomains(customerId: string) {
    return this.prisma.domain.findMany({ where: { customerId } });
  }

  async createDomain(
    customerId: string,
    data: {
      domainName: string;
      registrar?: string;
      username?: string;
      password?: string;
      purchaseDate?: Date | string;
      expiryDate: Date | string;
      autoRenewEnabled?: boolean;
      renewalAmount?: number;
      nameservers?: string[];
    },
  ) {
    const domain = await this.prisma.domain.create({
      data: {
        customerId,
        domainName: data.domainName,
        registrar: data.registrar,
        usernameEnc: data.username ? this.encryption.encrypt(data.username) : undefined,
        passwordEnc: data.password ? this.encryption.encrypt(data.password) : undefined,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        expiryDate: new Date(data.expiryDate),
        autoRenewEnabled: data.autoRenewEnabled ?? false,
        renewalAmount: data.renewalAmount,
        nameservers: data.nameservers ?? [],
      },
    });
    await this.prisma.customerTimelineEvent.create({
      data: {
        customerId,
        eventType: 'DOMAIN_ADDED',
        title: 'Domain added',
        description: data.domainName,
        metadata: { domainId: domain.id },
      },
    });
    return domain;
  }

  async updateDomain(
    customerId: string,
    domainId: string,
    data: {
      domainName?: string;
      registrar?: string;
      username?: string;
      password?: string;
      purchaseDate?: Date | string | null;
      expiryDate?: Date | string;
      autoRenewEnabled?: boolean;
      renewalAmount?: number | null;
      nameservers?: string[];
    },
  ) {
    const existing = await this.prisma.domain.findFirst({ where: { id: domainId, customerId } });
    if (!existing) throw new NotFoundException('Domain not found');
    return this.prisma.domain.update({
      where: { id: domainId },
      data: {
        domainName: data.domainName,
        registrar: data.registrar,
        usernameEnc: data.username !== undefined ? (data.username ? this.encryption.encrypt(data.username) : null) : undefined,
        passwordEnc: data.password !== undefined ? (data.password ? this.encryption.encrypt(data.password) : null) : undefined,
        purchaseDate: data.purchaseDate !== undefined ? (data.purchaseDate ? new Date(data.purchaseDate) : null) : undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        autoRenewEnabled: data.autoRenewEnabled,
        renewalAmount: data.renewalAmount,
        nameservers: data.nameservers,
      },
    });
  }

  async removeDomain(customerId: string, domainId: string) {
    const existing = await this.prisma.domain.findFirst({ where: { id: domainId, customerId } });
    if (!existing) throw new NotFoundException('Domain not found');
    return this.prisma.domain.delete({ where: { id: domainId } });
  }

  listHosting(customerId: string) {
    return this.prisma.hostingAccount.findMany({ where: { customerId } });
  }

  async createHosting(
    customerId: string,
    data: {
      provider: string;
      controlPanelUrl?: string;
      username?: string;
      password?: string;
      serverIp?: string;
      hostingPlan?: string;
      renewalDate: Date | string;
      renewalAmount?: number;
    },
  ) {
    const hosting = await this.prisma.hostingAccount.create({
      data: {
        customerId,
        provider: data.provider,
        controlPanelUrl: data.controlPanelUrl,
        usernameEnc: data.username ? this.encryption.encrypt(data.username) : undefined,
        passwordEnc: data.password ? this.encryption.encrypt(data.password) : undefined,
        serverIp: data.serverIp,
        hostingPlan: data.hostingPlan,
        renewalDate: new Date(data.renewalDate),
        renewalAmount: data.renewalAmount,
      },
    });
    await this.prisma.customerTimelineEvent.create({
      data: {
        customerId,
        eventType: 'HOSTING_ADDED',
        title: 'Hosting added',
        description: data.provider,
        metadata: { hostingId: hosting.id },
      },
    });
    return hosting;
  }

  async updateHosting(
    customerId: string,
    hostId: string,
    data: {
      provider?: string;
      controlPanelUrl?: string | null;
      username?: string;
      password?: string;
      serverIp?: string | null;
      hostingPlan?: string | null;
      renewalDate?: Date | string;
      renewalAmount?: number | null;
    },
  ) {
    const existing = await this.prisma.hostingAccount.findFirst({ where: { id: hostId, customerId } });
    if (!existing) throw new NotFoundException('Hosting account not found');
    return this.prisma.hostingAccount.update({
      where: { id: hostId },
      data: {
        provider: data.provider,
        controlPanelUrl: data.controlPanelUrl,
        usernameEnc: data.username !== undefined ? (data.username ? this.encryption.encrypt(data.username) : null) : undefined,
        passwordEnc: data.password !== undefined ? (data.password ? this.encryption.encrypt(data.password) : null) : undefined,
        serverIp: data.serverIp,
        hostingPlan: data.hostingPlan,
        renewalDate: data.renewalDate ? new Date(data.renewalDate) : undefined,
        renewalAmount: data.renewalAmount,
      },
    });
  }

  async removeHosting(customerId: string, hostId: string) {
    const existing = await this.prisma.hostingAccount.findFirst({ where: { id: hostId, customerId } });
    if (!existing) throw new NotFoundException('Hosting account not found');
    return this.prisma.hostingAccount.delete({ where: { id: hostId } });
  }

  listCredentials(customerId: string) {
    return this.prisma.credentialVault.findMany({
      where: { customerId },
      select: { id: true, vaultType: true, label: true, username: true, url: true, notes: true, createdAt: true },
    });
  }

  createCredential(customerId: string, createdById: string, data: { vaultType: string; label: string; username?: string; password: string; url?: string; notes?: string }) {
    return this.prisma.credentialVault.create({
      data: {
        customerId,
        vaultType: data.vaultType as never,
        label: data.label,
        username: data.username,
        passwordEnc: this.encryption.encrypt(data.password),
        url: data.url,
        notes: data.notes,
        createdById,
      },
      select: { id: true, vaultType: true, label: true, username: true, url: true },
    });
  }

  async revealCredential(id: string, userId: string) {
    const c = await this.prisma.credentialVault.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Credential not found');
    await this.prisma.customerTimelineEvent.create({
      data: {
        customerId: c.customerId,
        eventType: 'CREDENTIALS_VIEWED',
        title: 'Credential viewed',
        description: `${c.label} (${c.vaultType})`,
        userId,
        metadata: { credentialId: c.id, vaultType: c.vaultType },
      },
    });
    await this.activityLog.log({
      userId,
      action: 'CREDENTIALS_VIEWED',
      module: 'customer',
      recordId: c.customerId,
      newValue: { credentialId: c.id, label: c.label },
    });
    return { ...c, password: this.encryption.decrypt(c.passwordEnc), passwordEnc: undefined };
  }

  listServices(customerId: string) {
    return this.prisma.customerService.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  createService(customerId: string, data: Prisma.CustomerServiceUncheckedCreateInput) {
    return this.prisma.customerService.create({ data: { ...data, customerId } });
  }

  async updateService(customerId: string, serviceId: string, data: Prisma.CustomerServiceUpdateInput) {
    const svc = await this.prisma.customerService.findFirst({ where: { id: serviceId, customerId } });
    if (!svc) throw new NotFoundException('Service not found');
    return this.prisma.customerService.update({ where: { id: serviceId }, data });
  }

  async removeService(customerId: string, serviceId: string) {
    const svc = await this.prisma.customerService.findFirst({ where: { id: serviceId, customerId } });
    if (!svc) throw new NotFoundException('Service not found');
    return this.prisma.customerService.delete({ where: { id: serviceId } });
  }

  async getRevenueSummary(customerId: string) {
    const services = await this.prisma.customerService.findMany({
      where: { customerId, isActive: true },
    });
    let oneTimeRevenue = 0;
    let monthlyRevenue = 0;
    const breakdown: Record<string, { oneTime: number; monthly: number }> = {};
    for (const svc of services) {
      const oneTime = Number(svc.oneTimeAmount ?? 0);
      const monthly = Number(svc.monthlyAmount ?? 0);
      oneTimeRevenue += oneTime;
      monthlyRevenue += monthly;
      const key = svc.serviceType;
      if (!breakdown[key]) breakdown[key] = { oneTime: 0, monthly: 0 };
      breakdown[key].oneTime += oneTime;
      breakdown[key].monthly += monthly;
    }
    return {
      oneTimeRevenue,
      monthlyRevenue,
      annualProjection: monthlyRevenue * 12,
      breakdown: Object.entries(breakdown).map(([serviceType, amounts]) => ({
        serviceType: serviceType as ServiceType,
        ...amounts,
      })),
    };
  }

  listPayments(customerId: string) {
    return this.prisma.payment.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  listNotifyTemplates() {
    return Object.entries(CUSTOMER_NOTIFY_TEMPLATES).map(([id, tpl]) => ({ id, ...tpl }));
  }

  async getNotificationDraft(customerId: string, reason: CustomerEmailReason, notes?: string) {
    const data = await this.buildNotificationEmailData(customerId, reason, notes);
    return {
      to: data.customer.email,
      subject: getCustomerNoticeSubject(reason),
      body: buildCustomerNoticeHtml(data),
      contactName: data.customer.ownerName,
      companyName: data.customer.companyName,
    };
  }

  async getNotificationEmailPreview(customerId: string, reason: CustomerEmailReason) {
    if (!(reason in CUSTOMER_NOTIFY_TEMPLATES)) {
      throw new BadRequestException('Invalid notification reason');
    }
    const data = await this.buildNotificationEmailData(customerId, reason);
    const tpl = CUSTOMER_NOTIFY_TEMPLATES[reason];
    return {
      to: data.customer.email,
      subject: getCustomerNoticeSubject(reason),
      pendingTotal: data.pendingTotal,
      paymentCount: data.payments.length,
      invoiceCount: data.invoices.length,
      template: tpl,
      bodyHtml: buildCustomerNoticeHtml(data),
    };
  }

  async sendNotificationEmail(customerId: string, userId: string, dto: SendCustomerEmailDto) {
    if (!(dto.reason in CUSTOMER_NOTIFY_TEMPLATES)) {
      throw new BadRequestException('Invalid notification reason');
    }
    const data = await this.buildNotificationEmailData(customerId, dto.reason, dto.notes);
    if (!data.customer.email) {
      throw new BadRequestException('Customer has no email address. Add email on the customer profile first.');
    }

    const subject = getCustomerNoticeSubject(dto.reason);
    const html = buildCustomerNoticeHtml(data);
    const result = await this.mail.send(data.customer.email, subject, html);

    const tpl = CUSTOMER_NOTIFY_TEMPLATES[dto.reason];
    await this.prisma.customerTimelineEvent.create({
      data: {
        customerId,
        eventType: 'EMAIL_SENT',
        title: `Email sent: ${tpl.label}`,
        description: `To ${data.customer.email} · ${subject}`,
        userId,
        metadata: {
          reason: dto.reason,
          pendingTotal: data.pendingTotal,
          provider: result.skipped ? 'skipped' : (result.provider ?? 'sent'),
        },
      },
    });
    await this.activityLog.log({
      userId,
      action: 'CUSTOMER_EMAIL_SENT',
      module: 'customer',
      recordId: customerId,
      newValue: { reason: dto.reason, to: data.customer.email, subject },
    });

    return { sent: !result.skipped, to: data.customer.email, subject, reason: dto.reason, pendingTotal: data.pendingTotal };
  }

  private async buildNotificationEmailData(customerId: string, reason: CustomerEmailReason, notes?: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const [payments, invoices] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          customerId,
          status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] },
          pendingAmount: { gt: 0 },
        },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.invoice.findMany({
        where: {
          customerId,
          status: { in: ['SENT', 'OVERDUE'] },
        },
        orderBy: { dueDate: 'asc' },
      }),
    ]);

    const totalFromPayments = payments.reduce((sum, p) => sum + Number(p.pendingAmount), 0);
    const totalFromInvoices = invoices.reduce((sum, inv) => sum + Number(inv.grandTotal), 0);
    const computedTotal = totalFromPayments > 0 ? totalFromPayments : totalFromInvoices;

    const websiteUrl = customer.liveWebsiteLink || customer.domain || null;

    return {
      reason,
      customer: {
        companyName: customer.companyName,
        ownerName: customer.ownerName,
        email: customer.email,
      },
      pendingTotal: computedTotal,
      payments: payments.map((p) => ({
        pendingAmount: Number(p.pendingAmount),
        dueDate: p.dueDate,
        status: p.status,
      })),
      invoices: invoices.map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        grandTotal: Number(inv.grandTotal),
        dueDate: inv.dueDate,
        status: inv.status,
      })),
      websiteUrl,
      notes: notes?.trim() ? notes.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;') : undefined,
    };
  }
}
