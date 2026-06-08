import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LeadStatus, LeadPriority, UserRole } from '@prisma/client';
import { LeadsService } from './leads.service';
import { CurrentUser, JwtPayload } from '../common/decorators/user.decorator';
import { Roles } from '../common/decorators/metadata.decorator';
import { RolesGuard } from '../common/guards/auth.guards';

@Controller('leads')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LeadsController {
  constructor(private leads: LeadsService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: LeadStatus,
    @Query('assignedToId') assignedToId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.leads.findAll(
      {
        status,
        assignedToId,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      },
      user.role,
      user.sub,
    );
  }

  @Get('my')
  findMy(@CurrentUser() user: JwtPayload) {
    return this.leads.findMy(user.sub);
  }

  @Get('team-summary')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  teamSummary() {
    return this.leads.teamSummary();
  }

  @Get('kanban')
  kanban(@CurrentUser() user: JwtPayload) {
    return this.leads.kanban(user.role, user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.leads.findOne(id, user.role, user.sub);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() body: Record<string, unknown>) {
    return this.leads.create(body as Parameters<LeadsService['create']>[0], user.sub, user.role);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() body: Record<string, unknown>) {
    return this.leads.update(id, body, user.sub, user.role);
  }

  @Patch(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  assign(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { assignedToId: string; followUpDate?: string; priority?: string; remarks?: string },
  ) {
    return this.leads.assign(id, body.assignedToId, user.sub, user.role, {
      followUpDate: body.followUpDate ? new Date(body.followUpDate) : undefined,
      priority: body.priority as LeadPriority | undefined,
      remarks: body.remarks,
    });
  }

  @Post(':id/quotations')
  createQuotation(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() body: Record<string, unknown>) {
    const payload = body as {
      lineItems: unknown[];
      validUntil: string;
      clientName?: string;
      clientEmail?: string;
      notes?: string;
      gstRate?: number;
      status?: string;
    };
    return this.leads.createQuotation(
      id,
      {
        lineItems: payload.lineItems,
        validUntil: new Date(payload.validUntil),
        clientName: payload.clientName,
        clientEmail: payload.clientEmail,
        notes: payload.notes,
        gstRate: payload.gstRate,
        status: payload.status as Parameters<LeadsService['createQuotation']>[1]['status'],
      },
      user.sub,
      user.role,
    );
  }

  @Post(':id/convert')
  convert(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.leads.convertToCustomer(id, user.sub, user.role);
  }

  @Post(':id/activities')
  logActivity(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() body: Record<string, unknown>) {
    return this.leads.logActivity(id, user.sub, user.role, body as Parameters<LeadsService['logActivity']>[3]);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.leads.remove(id, user.role, user.sub);
  }
}
