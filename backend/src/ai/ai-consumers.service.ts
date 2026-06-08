import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { KafkaService } from '../events/kafka.service';
import { ProcessedEventService } from '../events/processed-event.service';
import { EVENT_TOPICS, DomainEvent } from '../events/event-topics';
import { LeadScoringService } from './lead-scoring.service';
import { EmbeddingService } from './embedding.service';
import { TicketTriageService } from './ticket-triage.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventPublisherService } from '../events/event-publisher.service';
import { shouldRunKafkaConsumers } from '../events/consumer.util';

@Injectable()
export class AiConsumersService implements OnModuleInit {
  private readonly logger = new Logger(AiConsumersService.name);

  constructor(
    private kafka: KafkaService,
    private processed: ProcessedEventService,
    private leadScoring: LeadScoringService,
    private embedding: EmbeddingService,
    private ticketTriage: TicketTriageService,
    private prisma: PrismaService,
    private events: EventPublisherService,
  ) {}

  async onModuleInit() {
    if (!this.kafka.isEnabled() || !shouldRunKafkaConsumers()) {
      this.logger.log('AI Kafka consumers skipped (worker-only or Kafka disabled)');
      return;
    }

    await this.kafka.subscribe(
      [EVENT_TOPICS.LEAD_CREATED, EVENT_TOPICS.LEAD_ACTIVITY_LOGGED],
      'techpotli-ai-lead-scoring',
      (event) => this.handleLeadEvent(event),
    );

    await this.kafka.subscribe(
      [EVENT_TOPICS.ENTITY_UPDATED, EVENT_TOPICS.LEAD_CREATED, EVENT_TOPICS.LEAD_CONVERTED],
      'techpotli-ai-embeddings',
      (event) => this.handleEmbeddingEvent(event),
    );

    await this.kafka.subscribe(
      [EVENT_TOPICS.SUPPORT_TICKET_CREATED],
      'techpotli-ai-ticket-triage',
      (event) => this.handleTicketEvent(event),
    );

    await this.kafka.subscribe(
      [EVENT_TOPICS.LEAD_CREATED, EVENT_TOPICS.LEAD_CONVERTED, EVENT_TOPICS.INVOICE_SENT],
      'techpotli-cqrs-dashboard',
      (event) => this.handleDashboardEvent(event),
    );
  }

  private async handleOnce(event: DomainEvent, handler: () => Promise<void>) {
    if (await this.processed.isProcessed(event.id)) return;
    const claimed = await this.processed.markProcessed(event.id, event.topic);
    if (!claimed) return;
    try {
      await handler();
    } catch (err) {
      this.logger.error(`Event ${event.id} failed: ${(err as Error).message}`);
    }
  }

  private async handleLeadEvent(event: DomainEvent) {
    await this.handleOnce(event, async () => {
      const payload = event.payload as { id?: string; leadId?: string };
      const leadId = payload.id || payload.leadId;
      if (!leadId) return;
      const result = await this.leadScoring.scoreLead(leadId);
      if (result) {
        await this.events.publish(EVENT_TOPICS.LEAD_SCORED, { leadId, ...result });
      }
    });
  }

  private async handleEmbeddingEvent(event: DomainEvent) {
    await this.handleOnce(event, async () => {
      const payload = event.payload as {
        entityType?: string;
        entityId?: string;
        id?: string;
        leadId?: string;
        customerId?: string;
      };
      const entityType = payload.entityType || (payload.leadId ? 'lead' : payload.customerId ? 'customer' : null);
      const entityId = payload.entityId || payload.id || payload.leadId || payload.customerId;
      if (!entityType || !entityId) return;

      if (entityType === 'lead') {
        const lead = await this.prisma.lead.findUnique({ where: { id: entityId } });
        if (lead) await this.embedding.upsertEmbedding('lead', entityId, this.embedding.buildLeadText(lead));
      } else if (entityType === 'customer') {
        const customer = await this.prisma.customer.findUnique({ where: { id: entityId } });
        if (customer) await this.embedding.upsertEmbedding('customer', entityId, this.embedding.buildCustomerText(customer));
      }
    });
  }

  private async handleTicketEvent(event: DomainEvent) {
    await this.handleOnce(event, async () => {
      const payload = event.payload as { id?: string };
      if (!payload.id) return;
      const triage = await this.ticketTriage.triageTicket(payload.id);
      if (triage) {
        await this.events.publish(EVENT_TOPICS.SUPPORT_TICKET_TRIAGED, { ticketId: payload.id, ...triage });
      }
    });
  }

  private async handleDashboardEvent(event: DomainEvent) {
    await this.handleOnce(event, async () => {
      const [leadCount, customerCount, openTickets, pendingInvoices] = await Promise.all([
        this.prisma.lead.count({ where: { status: { notIn: ['WON', 'LOST'] } } }),
        this.prisma.customer.count({ where: { status: 'ACTIVE' } }),
        this.prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
        this.prisma.invoice.count({ where: { status: { in: ['DRAFT', 'SENT'] } } }),
      ]);
      const snapshot = { leadCount, customerCount, openTickets, pendingInvoices, updatedAt: new Date().toISOString() };
      await this.prisma.dashboardSnapshot.upsert({
        where: { metricKey: 'dashboard.kpis' },
        create: { metricKey: 'dashboard.kpis', value: snapshot },
        update: { value: snapshot },
      });
    });
  }
}
