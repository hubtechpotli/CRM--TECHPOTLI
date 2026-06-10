import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser, JwtPayload } from '../common/decorators/user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query('unread') unread?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
  ) {
    return this.notifications.list(user.sub, {
      unreadOnly: unread === 'true',
      limit: limit ? parseInt(limit, 10) : undefined,
      cursor,
      page: page ? parseInt(page, 10) : undefined,
    });
  }

  @Get('unread-count')
  count(@CurrentUser() user: JwtPayload) {
    return this.notifications.unreadCount(user.sub);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: JwtPayload) {
    return this.notifications.markAllRead(user.sub);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.notifications.markRead(user.sub, id);
  }
}
