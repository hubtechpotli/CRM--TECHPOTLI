import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CustomerWorkItemStatus } from '@prisma/client';
import { TeamUpdatesService } from './team-updates.service';
import { CurrentUser, JwtPayload } from '../common/decorators/user.decorator';

@Controller('team-updates')
@UseGuards(AuthGuard('jwt'))
export class TeamUpdatesController {
  constructor(private teamUpdates: TeamUpdatesService) {}

  @Get('feed')
  feed(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: CustomerWorkItemStatus,
    @Query('mine') mine?: string,
    @Query('unassigned') unassigned?: string,
    @Query('openOnly') openOnly?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
    @Query('cursor') cursor?: string,
    @Query('q') q?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('createdById') createdById?: string,
    @Query('customerId') customerId?: string,
    @Query('projectId') projectId?: string,
    @Query('includeUpdates') includeUpdates?: string,
  ) {
    return this.teamUpdates.feed(user.sub, {
      status,
      mine: mine === '1',
      unassigned: unassigned === '1',
      openOnly: openOnly !== '0',
      limit: limit ? parseInt(limit, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      cursor: cursor || undefined,
      q,
      from,
      to,
      createdById,
      customerId,
      projectId,
      includeUpdates: includeUpdates === '1',
    });
  }

  @Get('work-items/:customerId/:itemId/updates')
  workItemUpdates(
    @Param('customerId') customerId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.teamUpdates.getWorkItemUpdates(customerId, itemId);
  }

  @Get('summary')
  summary(@CurrentUser() user: JwtPayload) {
    return this.teamUpdates.summary(user.sub);
  }
}
