import { Controller, Get, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/metadata.decorator';
import { ActivityLogService } from './activity-log.service';

@Controller('activity-log')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class ActivityLogController {
  constructor(private activityLog: ActivityLogService) {}

  @Get()
  list(
    @Query('userId') userId?: string,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const filters = {
      userId: userId || undefined,
      module: module || undefined,
      action: action || undefined,
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 50,
    };
    return Promise.all([
      this.activityLog.findAll(filters),
      this.activityLog.count(filters),
    ]).then(([items, total]) => ({ items, total }));
  }
}
