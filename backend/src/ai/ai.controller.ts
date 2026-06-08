import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { EmailDraftService } from './email-draft.service';
import { LeadScoringService } from './lead-scoring.service';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(AuthGuard('jwt'))
export class AiController {
  constructor(
    private emailDraft: EmailDraftService,
    private leadScoring: LeadScoringService,
  ) {}

  @Post('leads/:id/draft-email')
  @ApiOperation({ summary: 'Generate AI follow-up email draft for a lead' })
  draftLeadEmail(@Param('id') id: string) {
    return this.emailDraft.draftForLead(id);
  }

  @Post('customers/:id/draft-email')
  @ApiOperation({ summary: 'Generate AI check-in email draft for a customer' })
  draftCustomerEmail(@Param('id') id: string) {
    return this.emailDraft.draftForCustomer(id);
  }

  @Post('leads/:id/score')
  @ApiOperation({ summary: 'Trigger AI lead scoring' })
  scoreLead(@Param('id') id: string) {
    return this.leadScoring.scoreLead(id);
  }

  @Get('health')
  @ApiOperation({ summary: 'AI service health' })
  health() {
    return { status: 'ok' };
  }
}
