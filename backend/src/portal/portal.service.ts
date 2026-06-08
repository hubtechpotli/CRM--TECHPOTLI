import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PortalService {
  constructor(
    private prisma: PrismaService,
    private activityLog: ActivityLogService,
  ) {}

  async createAccess(customerId: string) {
    return this.prisma.clientPortalAccess.create({
      data: { customerId, token: uuidv4() },
    });
  }

  getAccessForCustomer(customerId: string) {
    return this.prisma.clientPortalAccess.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeAccess(customerId: string, accessId?: string) {
    if (accessId) {
      const access = await this.prisma.clientPortalAccess.findFirst({
        where: { id: accessId, customerId },
      });
      if (!access) throw new NotFoundException('Portal access not found');
      return this.prisma.clientPortalAccess.update({
        where: { id: accessId },
        data: { isRevoked: true },
      });
    }
    await this.prisma.clientPortalAccess.updateMany({
      where: { customerId, isRevoked: false },
      data: { isRevoked: true },
    });
    return { revoked: true };
  }

  async regenerateAccess(customerId: string) {
    await this.prisma.clientPortalAccess.updateMany({
      where: { customerId, isRevoked: false },
      data: { isRevoked: true },
    });
    return this.prisma.clientPortalAccess.create({
      data: { customerId, token: uuidv4() },
    });
  }

  async getByToken(token: string) {
    const access = await this.prisma.clientPortalAccess.findUnique({
      where: { token },
      include: {
        customer: {
          include: {
            services: { where: { isActive: true } },
            invoices: { orderBy: { invoiceDate: 'desc' }, take: 20 },
            payments: { orderBy: { createdAt: 'desc' }, take: 20 },
            renewals: { orderBy: { renewalDate: 'asc' } },
            projects: { orderBy: { createdAt: 'desc' }, take: 10 },
            supportTickets: { orderBy: { createdAt: 'desc' }, take: 20 },
            quotations: {
              where: { status: 'SENT' },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });
    if (!access || access.isRevoked) throw new NotFoundException('Invalid portal link');
    if (access.expiresAt && access.expiresAt < new Date()) throw new NotFoundException('Portal link expired');

    await this.prisma.clientPortalAccess.update({
      where: { id: access.id },
      data: { visitCount: { increment: 1 }, lastVisitedAt: new Date() },
    });
    await this.activityLog.log({
      action: 'PORTAL_VISIT',
      module: 'customer',
      recordId: access.customerId,
    });

    return access.customer;
  }

  async listTickets(token: string) {
    const access = await this.prisma.clientPortalAccess.findUnique({ where: { token } });
    if (!access || access.isRevoked) throw new NotFoundException('Invalid portal link');
    return this.prisma.supportTicket.findMany({
      where: { customerId: access.customerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async createTicket(token: string, subject: string, description: string) {
    const access = await this.prisma.clientPortalAccess.findUnique({ where: { token } });
    if (!access || access.isRevoked) throw new NotFoundException('Invalid portal link');
    const ticketNumber = `TKT-${Date.now()}`;
    return this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        customerId: access.customerId,
        subject,
        description,
        createdById: (await this.prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } }))!.id,
      },
    });
  }
}
