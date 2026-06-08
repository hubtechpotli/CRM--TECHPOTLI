import { Injectable, Logger } from '@nestjs/common';
import { KafkaService } from '../events/kafka.service';
import { LeadScoringService } from './lead-scoring.service';
import { EmbeddingService } from './embedding.service';
import { TicketTriageService } from './ticket-triage.service';

/** Runs AI/embedding work inline when Kafka is unavailable (local dev without Docker). */
@Injectable()
export class AsyncProcessingService {
  private readonly logger = new Logger(AsyncProcessingService.name);

  constructor(
    private kafka: KafkaService,
    private leadScoring: LeadScoringService,
    private embedding: EmbeddingService,
    private ticketTriage: TicketTriageService,
  ) {}

  private run(task: () => Promise<void>) {
    if (this.kafka.isEnabled()) return;
    setImmediate(() => task().catch((err) => this.logger.warn((err as Error).message)));
  }

  onLeadCreated(lead: {
    id: string;
    companyName: string;
    contactName: string;
    phone?: string;
    email?: string | null;
    source?: string;
    interestedServices?: string[];
    remarks?: string | null;
    status?: string;
  }) {
    this.run(async () => {
      await this.leadScoring.scoreLead(lead.id);
      await this.embedding.upsertEmbedding('lead', lead.id, this.embedding.buildLeadText(lead));
    });
  }

  onLeadActivity(leadId: string) {
    this.run(async () => {
      await this.leadScoring.scoreLead(leadId);
    });
  }

  onLeadConverted(customer: {
    id: string;
    companyName: string;
    ownerName: string;
    email?: string | null;
    phone?: string;
    natureOfBusiness?: string | null;
    tags?: string[];
  }) {
    this.run(async () => {
      await this.embedding.upsertEmbedding(
        'customer',
        customer.id,
        this.embedding.buildCustomerText(customer),
      );
    });
  }

  onSupportTicketCreated(ticketId: string) {
    this.run(async () => {
      await this.ticketTriage.triageTicket(ticketId);
    });
  }
}
