import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventPublisherService } from '../events/event-publisher.service';
import { AsyncProcessingService } from '../ai/async-processing.service';

@Injectable()
export class SupportService {
  constructor(
    private prisma: PrismaService,
    private events: EventPublisherService,
    private asyncProcessing: AsyncProcessingService,
  ) {}

  findAll() {
    return this.prisma.supportTicket.findMany({
      include: { customer: { select: { id: true, companyName: true } }, assignedTo: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.supportTicket.findUnique({
      where: { id },
      include: { comments: { orderBy: { createdAt: 'asc' }, include: { user: { select: { id: true, name: true } } } } },
    });
  }

  async create(data: Prisma.SupportTicketCreateInput, createdById: string) {
    const ticket = await this.prisma.supportTicket.create({
      data: { ...data, createdBy: { connect: { id: createdById } } },
    });
    await this.events.supportTicketCreated(ticket as unknown as Record<string, unknown>, createdById);
    this.asyncProcessing.onSupportTicketCreated(ticket.id);
    return ticket;
  }

  update(id: string, data: Prisma.SupportTicketUpdateInput) {
    return this.prisma.supportTicket.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.supportTicket.delete({ where: { id } });
  }

  addComment(ticketId: string, userId: string, body: string, isInternal = false) {
    return this.prisma.ticketComment.create({ data: { ticketId, userId, body, isInternal } });
  }
}
