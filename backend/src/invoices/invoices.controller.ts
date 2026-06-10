import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InvoicesService } from './invoices.service';
import { CurrentUser, JwtPayload } from '../common/decorators/user.decorator';

@Controller('invoices')
@UseGuards(AuthGuard('jwt'))
export class InvoicesController {
  constructor(private invoices: InvoicesService) {}

  @Get()
  findAll(
    @Query('customerId') customerId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (customerId) return this.invoices.findByCustomer(customerId);
    return this.invoices.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id/pdf-status')
  pdfStatus(@Param('id') id: string) {
    return this.invoices.getPdfStatus(id);
  }

  @Post(':id/generate-pdf')
  generatePdf(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.invoices.enqueuePdfGeneration(id, user.sub);
  }

  @Post(':id/regenerate-pdf')
  regeneratePdf(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.invoices.regeneratePdf(id, user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoices.findOne(id);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() body: Record<string, unknown>) {
    return this.invoices.create(body as Parameters<InvoicesService['create']>[0], user.sub);
  }

  @Post(':id/send')
  sendEmail(@Param('id') id: string) {
    return this.invoices.sendEmail(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.invoices.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.invoices.remove(id);
  }
}
