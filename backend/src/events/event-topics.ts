export const EVENT_TOPICS = {
  LEAD_CREATED: 'crm.lead.created',
  LEAD_ACTIVITY_LOGGED: 'crm.lead.activity.logged',
  LEAD_CONVERTED: 'crm.lead.converted',
  LEAD_SCORED: 'crm.lead.scored',
  INVOICE_SENT: 'crm.invoice.sent',
  SUPPORT_TICKET_CREATED: 'crm.support.ticket.created',
  SUPPORT_TICKET_TRIAGED: 'crm.support.ticket.triaged',
  NOTIFICATION_DISPATCH: 'crm.notification.dispatch',
  ENTITY_UPDATED: 'crm.entity.updated',
  DLQ: 'crm.events.dlq',
} as const;

export type EventTopic = (typeof EVENT_TOPICS)[keyof typeof EVENT_TOPICS];

export interface DomainEvent<T = Record<string, unknown>> {
  id: string;
  topic: EventTopic;
  timestamp: string;
  payload: T;
  metadata?: { userId?: string; correlationId?: string };
}
