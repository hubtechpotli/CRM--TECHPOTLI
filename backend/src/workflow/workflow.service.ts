import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DomainEvent } from '../events/event-topics';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async processEvent(event: DomainEvent) {
    const rules = await this.prisma.workflowRule.findMany({
      where: { event: event.topic, enabled: true },
    });
    for (const rule of rules) {
      try {
        const conditions = rule.conditions as Record<string, unknown>;
        if (!this.matchesConditions(event, conditions)) continue;
        const actions = (Array.isArray(rule.actions) ? rule.actions : []) as {
          type: string;
          payload: Record<string, unknown>;
        }[];
        for (const action of actions) {
          await this.executeAction(action, event);
        }
      } catch (err) {
        this.logger.error(`Workflow ${rule.id} failed: ${(err as Error).message}`);
      }
    }
  }

  private matchesConditions(event: DomainEvent, conditions: Record<string, unknown>): boolean {
    if (!conditions || Object.keys(conditions).length === 0) return true;
    const payload = event.payload as Record<string, unknown>;
    for (const [key, expected] of Object.entries(conditions)) {
      if (payload[key] !== expected) return false;
    }
    return true;
  }

  private async executeAction(
    action: { type: string; payload: Record<string, unknown> },
    event: DomainEvent,
  ) {
    if (action.type === 'notify' && action.payload.userId) {
      await this.notifications.create({
        userId: String(action.payload.userId),
        type: 'WORKFLOW',
        title: String(action.payload.title || 'Workflow alert'),
        message: String(action.payload.message || `Event: ${event.topic}`),
        link: action.payload.link ? String(action.payload.link) : undefined,
      });
    }
  }

  async seedDefaults() {
    const count = await this.prisma.workflowRule.count();
    if (count > 0) return;
    await this.prisma.workflowRule.create({
      data: {
        name: 'Notify on high-score lead',
        event: 'crm.lead.scored',
        conditions: {},
        actions: [
          {
            type: 'notify',
            payload: {
              title: 'Hot lead scored by AI',
              message: 'A lead received a high AI score — review in Leads.',
              link: '/leads',
            },
          },
        ],
        enabled: true,
      },
    });
  }
}
