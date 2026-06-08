import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QuotationsService } from './quotations.service';
import { CurrentUser, JwtPayload } from '../common/decorators/user.decorator';
import { Public } from '../common/decorators/metadata.decorator';

@Controller('quotations')
@UseGuards(AuthGuard('jwt'))
export class QuotationsController {
  constructor(private quotations: QuotationsService) {}

  @Get()
  findAll() {
    return this.quotations.findAll();
  }

  @Public()
  @Post('approve/:token')
  approveByToken(@Param('token') token: string) {
    return this.quotations.approveByToken(token);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quotations.findOne(id);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() body: Record<string, unknown>) {
    const payload = body as {
      leadId?: string;
      customerId?: string;
      lineItems: unknown[];
      validUntil: string;
      clientName?: string;
      clientEmail?: string;
      notes?: string;
      gstRate?: number;
      status?: string;
    };
    return this.quotations.create(
      {
        ...payload,
        validUntil: new Date(payload.validUntil),
        status: payload.status as Parameters<QuotationsService['create']>[0]['status'],
      },
      user.sub,
    );
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.quotations.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.quotations.remove(id);
  }
}
