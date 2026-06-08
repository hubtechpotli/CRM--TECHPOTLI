import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OllamaService } from './ollama.service';

@Injectable()
export class EmailDraftService {
  constructor(
    private prisma: PrismaService,
    private ollama: OllamaService,
  ) {}

  async draftForLead(leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        activities: { orderBy: { createdAt: 'desc' }, take: 5 },
        quotations: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    const context = {
      company: lead.companyName,
      contact: lead.contactName,
      status: lead.status,
      services: lead.interestedServices,
      lastActivities: lead.activities,
      quotation: lead.quotations[0],
    };

    return this.generateDraft('lead follow-up', context, lead.contactName, lead.email);
  }

  async draftForCustomer(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        callLogs: { orderBy: { createdAt: 'desc' }, take: 5 },
        renewals: { where: { status: 'ACTIVE' }, take: 3 },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const context = {
      company: customer.companyName,
      contact: customer.ownerName,
      callLogs: customer.callLogs,
      renewals: customer.renewals,
    };

    return this.generateDraft('customer check-in', context, customer.ownerName, customer.email);
  }

  private async generateDraft(
    purpose: string,
    context: unknown,
    contactName: string,
    email?: string | null,
  ) {
    const start = Date.now();
    const prompt = `Write a professional ${purpose} email.
Contact: ${contactName}
Context: ${JSON.stringify(context)}
Return JSON only: {"subject":"...","body":"HTML paragraph tags only, no markdown"}`;
    const raw = await this.ollama.generate(
      prompt,
      'You write concise B2B emails for a digital agency (TechPotli). Friendly, professional tone.',
    );

    let subject = `Following up — ${contactName}`;
    let body = `<p>Hi ${contactName},</p><p>I wanted to follow up on our recent conversation. Please let me know a good time to connect.</p><p>Best regards,<br/>TechPotli Team</p>`;

    if (raw) {
      try {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]) as { subject?: string; body?: string };
          if (parsed.subject) subject = parsed.subject;
          if (parsed.body) body = parsed.body;
        }
      } catch {
        /* use fallback */
      }
    }

    await this.prisma.aiRequestLog.create({
      data: {
        type: 'EMAIL_DRAFT',
        input: { purpose, context: JSON.parse(JSON.stringify(context)) },
        output: { subject, body },
        latencyMs: Date.now() - start,
      },
    });

    return { subject, body, to: email || null };
  }
}
