import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AttendanceService } from './attendance.service';
import { CurrentUser, ClientIp, JwtPayload } from '../common/decorators/user.decorator';

@Controller('attendance')
@UseGuards(AuthGuard('jwt'))
export class AttendanceController {
  constructor(private attendance: AttendanceService) {}

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.attendance.list(userId || user.sub, from ? new Date(from) : undefined, to ? new Date(to) : undefined);
  }

  @Post('clock-in')
  clockIn(@CurrentUser() user: JwtPayload, @ClientIp() ip: string) {
    return this.attendance.clockIn(user.sub, { ip });
  }

  @Post('clock-out')
  clockOut(@CurrentUser() user: JwtPayload) {
    return this.attendance.clockOut(user.sub);
  }
}
