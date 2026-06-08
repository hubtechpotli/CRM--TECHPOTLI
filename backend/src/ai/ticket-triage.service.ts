import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OllamaService } from './ollama.service';

@Injectable()
export class TicketTriageService {
  private readonly logger = new Logger(TicketTriageService.name);

  constructor(
    private prisma: PrismaService,
    private ollama: OllamaService,
  ) {}

  async triageTicket(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { customer: { select: { companyName: true, businessScore: true } } },
    });
    if (!ticket) return null;

    const prompt = `Classify this support ticket. Return JSON only: {"priority":"LOW|MEDIUM|HIGH|URGENT","category":"billing|technical|general","suggestedAction":"one sentence"}
Subject: ${ticket.subject}
Description: ${ticket.description}
Customer: ${ticket.customer?.companyName}`;
    const raw = await this.ollama.generate(prompt, 'You triage B2B support tickets.');

    let triage = {
      priority: ticket.priority,
      category: 'general',
      suggestedAction: 'Review and assign to support team',
    };

    if (raw) {
      try {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]) as {
            priority?: string;
            category?: string;
            suggestedAction?: string;
          };
          if (parsed.priority) triage.priority = parsed.priority as typeof triage.priority;
          if (parsed.category) triage.category = parsed.category;
          if (parsed.suggestedAction) triage.suggestedAction = parsed.suggestedAction;
        }
      } catch {
        this.logger.warn(`Triage parse failed for ticket ${ticketId}`);
      }
    }

    const priorityMap: Record<string, string> = {
      LOW: 'LOW',
      MEDIUM: 'MEDIUM',
      HIGH: 'HIGH',
      URGENT: 'URGENT',
    };
    const mappedPriority = priorityMap[triage.priority] || ticket.priority;

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        priority: mappedPriority as never,
        tags: [triage.category, 'ai-triaged'],
      },
    });

    await this.prisma.aiRequestLog.create({
      data: {
        type: 'TICKET_TRIAGE',
        input: { ticketId, subject: ticket.subject },
        output: triage,
        latencyMs: 0,
      },
    });

    return triage;
  }
}
