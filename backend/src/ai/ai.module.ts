import { Module } from '@nestjs/common';
import { OllamaService } from './ollama.service';
import { EmbeddingService } from './embedding.service';
import { LeadScoringService } from './lead-scoring.service';
import { EmailDraftService } from './email-draft.service';
import { TicketTriageService } from './ticket-triage.service';
import { AiController } from './ai.controller';
import { AiConsumersService } from './ai-consumers.service';
import { AsyncProcessingService } from './async-processing.service';

@Module({
  controllers: [AiController],
  providers: [
    OllamaService,
    EmbeddingService,
    LeadScoringService,
    EmailDraftService,
    TicketTriageService,
    AiConsumersService,
    AsyncProcessingService,
  ],
  exports: [
    OllamaService,
    EmbeddingService,
    LeadScoringService,
    EmailDraftService,
    TicketTriageService,
    AsyncProcessingService,
  ],
})
export class AiModule {}
