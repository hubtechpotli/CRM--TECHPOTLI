import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { ApprovalsService } from './approvals.service';
import { CurrentUser, JwtPayload } from '../common/decorators/user.decorator';
import { Roles } from '../common/decorators/metadata.decorator';
import { RolesGuard } from '../common/guards/auth.guards';

@Controller('approvals')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class ApprovalsController {
  constructor(private approvals: ApprovalsService) {}

  @Get('pending')
  listPending() {
    return this.approvals.listPending();
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.approvals.approve(id, user.sub);
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body('rejectionReason') rejectionReason?: string) {
    return this.approvals.reject(id, user.sub, rejectionReason);
  }
}
