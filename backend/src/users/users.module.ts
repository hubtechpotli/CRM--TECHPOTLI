import { Module } from '@nestjs/common';
import { UserAssigneesController } from './user-assignees.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UserAssigneesController, UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
