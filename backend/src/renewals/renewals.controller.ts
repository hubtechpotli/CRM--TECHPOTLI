import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RenewalsService } from './renewals.service';

@Controller('renewals')
@UseGuards(AuthGuard('jwt'))
export class RenewalsController {
  constructor(private renewals: RenewalsService) {}

  @Get()
  findAll() {
    return this.renewals.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.renewals.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.renewals.create(body as Parameters<RenewalsService['create']>[0]);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.renewals.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.renewals.remove(id);
  }
}
