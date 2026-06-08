import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjectStatus } from '@prisma/client';
import { ProjectsService } from './projects.service';
import { CurrentUser, JwtPayload } from '../common/decorators/user.decorator';

@Controller('projects')
@UseGuards(AuthGuard('jwt'))
export class ProjectsController {
  constructor(private projects: ProjectsService) {}

  @Get()
  findAll(@Query('customerId') customerId?: string, @Query('status') status?: ProjectStatus) {
    return this.projects.findAll({ customerId, status });
  }

  @Get('kanban')
  kanban() {
    return this.projects.kanban();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projects.findOne(id);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() body: Record<string, unknown>) {
    return this.projects.create(body as Parameters<ProjectsService['create']>[0], user.sub);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.projects.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projects.remove(id);
  }

  @Patch(':id/work-order/accept')
  acceptWorkOrder(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.projects.acceptWorkOrder(id, user.sub);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() body: { status: ProjectStatus; reason?: string }) {
    return this.projects.updateStatus(id, body.status, user.sub, body.reason);
  }

  @Post(':id/comments')
  addComment(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body('body') comment: string) {
    return this.projects.addComment(id, user.sub, comment);
  }

  @Post(':id/time-logs')
  addTimeLog(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() body: { startTime: string; endTime?: string; notes?: string }) {
    return this.projects.addTimeLog(id, user.sub, {
      startTime: new Date(body.startTime),
      endTime: body.endTime ? new Date(body.endTime) : undefined,
      notes: body.notes,
    });
  }
}
