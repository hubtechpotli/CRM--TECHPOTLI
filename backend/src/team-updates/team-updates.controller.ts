import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.teamUpdates.feed(user.sub, {
      status,
      mine: mine === '1',
      unassigned: unassigned === '1',
      openOnly: openOnly !== '0',
      take: take ? parseInt(take, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
    });
  }

  @Get('summary')
  summary(@CurrentUser() user: JwtPayload) {
    return this.teamUpdates.summary(user.sub);
  }
}
