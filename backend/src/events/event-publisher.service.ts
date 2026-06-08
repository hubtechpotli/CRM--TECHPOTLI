import { Injectable } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { DomainEvent, EVENT_TOPICS, EventTopic } from './event-topics';

@Injectable()
export class EventPublisherService {
  constructor(private kafka: KafkaService) {}

  async publish<T>(topic: EventTopic, payload: T, metadata?: DomainEvent['metadata']) {
    return this.kafka.publish(topic, payload, metadata);
  }

  leadCreated(lead: Record<string, unknown>, userId?: string) {
    return this.publish(EVENT_TOPICS.LEAD_CREATED, lead, { userId });
  }

  leadActivityLogged(leadId: string, activity: Record<string, unknown>, userId?: string) {
    return this.publish(EVENT_TOPICS.LEAD_ACTIVITY_LOGGED, { leadId, activity }, { userId });
  }

  leadConverted(leadId: string, customerId: string, userId?: string) {
    return this.publish(EVENT_TOPICS.LEAD_CONVERTED, { leadId, customerId }, { userId });
  }

  invoiceSent(invoice: Record<string, unknown>, userId?: string) {
    return this.publish(EVENT_TOPICS.INVOICE_SENT, invoice, { userId });
  }

  supportTicketCreated(ticket: Record<string, unknown>, userId?: string) {
    return this.publish(EVENT_TOPICS.SUPPORT_TICKET_CREATED, ticket, { userId });
  }

  notificationDispatch(notification: Record<string, unknown>) {
    return this.publish(EVENT_TOPICS.NOTIFICATION_DISPATCH, notification);
  }

  entityUpdated(entityType: string, entityId: string, data?: Record<string, unknown>) {
    return this.publish(EVENT_TOPICS.ENTITY_UPDATED, { entityType, entityId, data });
  }
}
