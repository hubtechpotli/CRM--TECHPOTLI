import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, TicketPriority } from '@prisma/client';
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

  async create(
    input: {
      customerId: string;
      subject: string;
      description: string;
      priority?: string;
      assignedToId?: string;
    },
    createdById: string,
  ) {
    const customerId = input.customerId?.trim();
    const subject = input.subject?.trim();
    const description = input.description?.trim();
    if (!customerId) throw new BadRequestException('Customer is required');
    if (!subject) throw new BadRequestException('Subject is required');
    if (!description) throw new BadRequestException('Description is required');

    const priorityValues = new Set<string>(Object.values(TicketPriority));
    const priority = priorityValues.has(String(input.priority ?? ''))
      ? (input.priority as TicketPriority)
      : TicketPriority.MEDIUM;

    const ticketNumber = `TKT-${Date.now()}`;
    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        subject,
        description,
        priority,
        customer: { connect: { id: customerId } },
        createdBy: { connect: { id: createdById } },
        ...(input.assignedToId?.trim()
          ? { assignedTo: { connect: { id: input.assignedToId.trim() } } }
          : {}),
      },
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
