import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { ExpensesService } from './expenses.service';
import { CurrentUser, JwtPayload } from '../common/decorators/user.decorator';
import { Roles } from '../common/decorators/metadata.decorator';
import { RolesGuard } from '../common/guards/auth.guards';

@Controller('expenses')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ExpensesController {
  constructor(private expenses: ExpensesService) {}

  @Get()
  findAll() {
    return this.expenses.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.expenses.findOne(id);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() body: Record<string, unknown>) {
    return this.expenses.create(body as Parameters<ExpensesService['create']>[0], user.sub);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.expenses.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.expenses.remove(id);
  }

  @Patch(':id/approve')
  @Roles(UserRole.SUPER_ADMIN)
  approve(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.expenses.approve(id, user.sub);
  }

  @Patch(':id/reject')
  @Roles(UserRole.SUPER_ADMIN)
  reject(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.expenses.reject(id, user.sub);
  }
}
