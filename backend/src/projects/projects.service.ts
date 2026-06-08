import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectStatus, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NumberSequenceService } from '../common/number-sequence.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { MailService } from '../mail/mail.service';
import { ActivityLogService } from '../activity-log/activity-log.service';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private numbers: NumberSequenceService,
    private notifications: NotificationsService,
    private gateway: NotificationsGateway,
    private mail: MailService,
    private activityLog: ActivityLogService,
  ) {}

  findAll(filters?: { customerId?: string; status?: ProjectStatus }) {
    return this.prisma.project.findMany({
      where: filters,
      include: { customer: { select: { id: true, companyName: true } }, workOrder: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async kanban() {
    const projects = await this.prisma.project.findMany({
      include: { customer: { select: { id: true, companyName: true } }, workOrder: true },
      orderBy: { updatedAt: 'desc' },
    });
    const columns: Record<ProjectStatus, typeof projects> = {} as Record<ProjectStatus, typeof projects>;
    for (const status of Object.values(ProjectStatus)) columns[status] = [];
    for (const project of projects) columns[project.status].push(project);
    return columns;
  }

  findOne(id: string) {
    return this.prisma.project.findUnique({
      where: { id },
      include: {
        customer: true,
        workOrder: true,
        comments: { orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true } } } },
        timeLogs: { orderBy: { startTime: 'desc' }, include: { user: { select: { name: true } } } },
      },
    });
  }

  async create(data: Prisma.ProjectUncheckedCreateInput, createdById: string) {
    const project = await this.prisma.project.create({ data: { ...data, createdById } });
    const woNumber = await this.numbers.next('WO');
    await this.prisma.workOrder.create({
      data: { workOrderNumber: woNumber, projectId: project.id, status: WorkOrderStatus.PENDING },
    });

    const full = await this.findOne(project.id);
    await this.notifyWorkOrderCreated(full!);
    await this.prisma.customerTimelineEvent.create({
      data: {
        customerId: project.customerId,
        eventType: 'PROJECT_CREATED',
        title: 'Project created',
        description: project.name,
        userId: createdById,
        metadata: { projectId: project.id },
      },
    });
    return full;
  }

  private async notifyWorkOrderCreated(project: NonNullable<Awaited<ReturnType<ProjectsService['findOne']>>>) {
    const userIds = new Set<string>();
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] }, isActive: true },
    });
    admins.forEach((a) => userIds.add(a.id));
    [project.designerId, project.frontendDevId, project.backendDevId, project.seoExecutiveId]
      .filter(Boolean)
      .forEach((id) => userIds.add(id!));

    const msg = `New work order: ${project.workOrder?.workOrderNumber} – ${project.name}`;
    for (const userId of userIds) {
      await this.notifications.create({
        userId,
        type: 'WORK_ORDER_NEW',
        title: 'New work order',
        message: msg,
        link: `/projects/${project.id}`,
      });
      await this.mail.sendToUser(userId, `[Work Order] ${project.workOrder?.workOrderNumber}`, `<p>${msg}</p>`);
    }
    this.gateway.emitToRoom('admins', 'work_order:new', project);
    this.gateway.emitToRoom('super_admin', 'work_order:new', project);
  }

  update(id: string, data: Prisma.ProjectUpdateInput) {
    return this.prisma.project.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.project.delete({ where: { id } });
  }

  async acceptWorkOrder(projectId: string, userId: string) {
    const wo = await this.prisma.workOrder.findUnique({ where: { projectId }, include: { project: true } });
    if (!wo) throw new NotFoundException('Work order not found');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const updated = await this.prisma.workOrder.update({
      where: { projectId },
      data: { status: WorkOrderStatus.ACCEPTED, acceptedAt: new Date(), acceptedById: userId },
    });
    const admins = await this.prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } } });
    for (const admin of admins) {
      await this.notifications.create({
        userId: admin.id,
        type: 'WO_ACCEPTED',
        title: 'Work order accepted',
        message: `${user?.name} accepted ${wo.workOrderNumber}`,
        link: `/projects/${projectId}`,
      });
    }
    await this.activityLog.log({
      userId,
      action: 'WO_ACCEPTED',
      module: 'project',
      recordId: projectId,
      newValue: { workOrderNumber: wo.workOrderNumber },
    });
    return updated;
  }

  async updateStatus(projectId: string, toStatus: ProjectStatus, changedById: string, reason?: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    const [, history] = await this.prisma.$transaction([
      this.prisma.project.update({ where: { id: projectId }, data: { status: toStatus } }),
      this.prisma.projectStatusHistory.create({
        data: { projectId, fromStatus: project.status, toStatus, changedById, reason },
      }),
    ]);
    await this.activityLog.log({
      userId: changedById,
      action: 'PROJECT_STATUS_CHANGED',
      module: 'project',
      recordId: projectId,
      oldValue: { status: project.status },
      newValue: { status: toStatus, reason },
    });
    const user = await this.prisma.user.findUnique({ where: { id: changedById }, select: { name: true } });
    await this.prisma.customerTimelineEvent.create({
      data: {
        customerId: project.customerId,
        eventType: 'PROJECT_STATUS_CHANGED',
        title: `Project status: ${project.name}`,
        description: reason ?? `${project.status} → ${toStatus}`,
        userId: changedById,
        metadata: { projectId, fromStatus: project.status, toStatus, changedBy: user?.name },
      },
    });
    if (toStatus === 'COMPLETED') {
      await this.prisma.customerTimelineEvent.create({
        data: {
          customerId: project.customerId,
          eventType: 'PROJECT_COMPLETED',
          title: 'Project completed',
          description: project.name,
          userId: changedById,
          metadata: { projectId },
        },
      });
    }
    return history;
  }

  async addComment(projectId: string, userId: string, body: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    const comment = await this.prisma.projectComment.create({ data: { projectId, userId, body } });
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    await this.prisma.customerTimelineEvent.create({
      data: {
        customerId: project.customerId,
        eventType: 'PROJECT_UPDATE',
        title: `Project update: ${project.name}`,
        description: body,
        userId,
        metadata: { projectId, commentId: comment.id, author: user?.name },
      },
    });
    return comment;
  }

  addTimeLog(projectId: string, userId: string, data: { startTime: Date; endTime?: Date; notes?: string }) {
    const durationMinutes = data.endTime
      ? Math.round((data.endTime.getTime() - data.startTime.getTime()) / 60000)
      : undefined;
    return this.prisma.projectTimeLog.create({ data: { projectId, userId, ...data, durationMinutes } });
  }
}
