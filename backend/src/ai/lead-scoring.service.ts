import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OllamaService } from './ollama.service';

@Injectable()
export class LeadScoringService {
  private readonly logger = new Logger(LeadScoringService.name);

  constructor(
    private prisma: PrismaService,
    private ollama: OllamaService,
  ) {}

  ruleBasedScore(lead: {
    priority?: string;
    budget?: unknown;
    followUpDate?: Date | null;
    status?: string;
    interestedServices?: string[];
  }): { score: number; reason: string } {
    let score = 40;
    const reasons: string[] = [];
    if (lead.priority === 'HIGH') {
      score += 20;
      reasons.push('High priority');
    } else if (lead.priority === 'LOW') {
      score -= 10;
    }
    if (lead.budget) {
      score += 15;
      reasons.push('Budget specified');
    }
    if (lead.interestedServices?.length) {
      score += 10;
      reasons.push('Services identified');
    }
    if (lead.followUpDate && lead.followUpDate <= new Date()) {
      score += 10;
      reasons.push('Follow-up due');
    }
    if (lead.status === 'NEGOTIATION' || lead.status === 'PROPOSAL_SENT') score += 15;
    return { score: Math.min(100, Math.max(0, score)), reason: reasons.join('; ') || 'Baseline score' };
  }

  async scoreLead(leadId: string): Promise<{ score: number; reason: string } | null> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { activities: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });
    if (!lead) return null;

    const context = JSON.stringify({
      company: lead.companyName,
      contact: lead.contactName,
      source: lead.source,
      budget: lead.budget,
      priority: lead.priority,
      status: lead.status,
      services: lead.interestedServices,
      remarks: lead.remarks,
      activities: lead.activities.map((a) => ({ type: a.type, notes: a.notes, outcome: a.outcome })),
    });

    const start = Date.now();
    const prompt = `Analyze this CRM lead and return ONLY valid JSON: {"score":0-100,"reason":"one sentence"}
Lead data: ${context}`;
    const raw = await this.ollama.generate(
      prompt,
      'You are a B2B sales analyst. Score lead quality 0-100. Respond with JSON only.',
    );

    let result = this.ruleBasedScore(lead);
    if (raw) {
      try {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]) as { score?: number; reason?: string };
          if (typeof parsed.score === 'number') {
            result = {
              score: Math.min(100, Math.max(0, Math.round(parsed.score))),
              reason: parsed.reason || result.reason,
            };
          }
        }
      } catch {
        this.logger.warn(`LLM parse failed for lead ${leadId}, using rule-based score`);
      }
    }

    await this.prisma.lead.update({
      where: { id: leadId },
      data: { aiScore: result.score, aiScoreReason: result.reason },
    });

    await this.prisma.aiRequestLog.create({
      data: {
        type: 'LEAD_SCORE',
        input: { leadId, context },
        output: result,
        latencyMs: Date.now() - start,
      },
    });

    return result;
  }
}
