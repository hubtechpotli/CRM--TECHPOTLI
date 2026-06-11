import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SupportService } from './support.service';
import { CurrentUser, JwtPayload } from '../common/decorators/user.decorator';

@Controller('support/tickets')
@UseGuards(AuthGuard('jwt'))
export class SupportController {
  constructor(private support: SupportService) {}

  @Get()
  findAll() {
    return this.support.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.support.findOne(id);
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      customerId: string;
      subject: string;
      description: string;
      priority?: string;
      assignedToId?: string;
    },
  ) {
    return this.support.create(body, user.sub);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.support.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.support.remove(id);
  }

  @Post(':id/comments')
  addComment(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() body: { body: string; isInternal?: boolean }) {
    return this.support.addComment(id, user.sub, body.body, body.isInternal);
  }
}
