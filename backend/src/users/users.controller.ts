import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../common/decorators/metadata.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/user.decorator';
import { RolesGuard } from '../common/guards/auth.guards';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  findAll(@Query('role') role?: UserRole) {
    return this.users.findAll(role);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN)
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@CurrentUser() user: JwtPayload, @Body() body: CreateUserDto) {
    return this.users.create(body, user.role as UserRole);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: UpdateUserDto) {
    return this.users.update(id, body, user.role as UserRole);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.users.remove(id, user.sub);
  }
}
