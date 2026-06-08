import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { ReportsService } from './reports.service';
import { CurrentUser, JwtPayload } from '../common/decorators/user.decorator';
import { Roles } from '../common/decorators/metadata.decorator';
import { RolesGuard } from '../common/guards/auth.guards';

@Controller('reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get('dashboard')
  dashboard() {
    return this.reports.dashboard();
  }

  @Get('crm-insights')
  crmInsights(@CurrentUser() user: JwtPayload) {
    return this.reports.crmInsights(user.role, user.sub);
  }

  @Get('employee-performance')
  employeePerformance() {
    return this.reports.employeePerformance();
  }

  @Get('mrr')
  mrr() {
    return this.reports.mrr();
  }

  @Get('profit-loss')
  profitLoss(@Query('months') months?: string) {
    return this.reports.profitLoss(months ? parseInt(months, 10) : 6);
  }

  @Get('team-work')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  teamWork() {
    return this.reports.teamWork();
  }
}
