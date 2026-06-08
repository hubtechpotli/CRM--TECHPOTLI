import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { EmailComposerService } from './email-composer.service';
import { ComposeEmailDto, SendComposedEmailDto } from './dto/compose-email.dto';
import { listPurposes, RecipientType } from './email-purposes';
import { CurrentUser, JwtPayload } from '../common/decorators/user.decorator';

@ApiTags('Email Center')
@ApiBearerAuth()
@Controller('email')
@UseGuards(AuthGuard('jwt'))
export class EmailController {
  constructor(private composer: EmailComposerService) {}

  @Get('purposes')
  @ApiOperation({ summary: 'List email purposes for lead or customer' })
  purposes(@Query('recipientType') recipientType: RecipientType) {
    return listPurposes(recipientType === 'customer' ? 'customer' : 'lead');
  }

  @Get('recipients')
  @ApiOperation({ summary: 'Search leads or customers for email recipient' })
  recipients(
    @Query('type') type: RecipientType,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    const n = limit ? Number(limit) : undefined;
    return this.composer.listRecipients(type === 'customer' ? 'customer' : 'lead', q, n);
  }

  @Post('compose')
  @ApiOperation({ summary: 'Generate email draft for selected recipient and purpose' })
  compose(@Body() dto: ComposeEmailDto) {
    return this.composer.compose(dto.recipientType, dto.recipientId, dto.purpose);
  }

  @Post('send')
  @ApiOperation({ summary: 'Send composed email (editable subject/body)' })
  send(@CurrentUser() user: JwtPayload, @Body() dto: SendComposedEmailDto) {
    return this.composer.send(
      user.sub,
      dto.recipientType,
      dto.recipientId,
      dto.purpose,
      dto.to,
      dto.subject,
      dto.body,
    );
  }
}
