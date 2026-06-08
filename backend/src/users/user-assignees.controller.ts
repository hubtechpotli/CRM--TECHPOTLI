import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { RolesGuard } from '../common/guards/auth.guards';

@Controller('users/assignees')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UserAssigneesController {
  constructor(private users: UsersService) {}

  @Get()
  list() {
    return this.users.findAssignees();
  }
}
