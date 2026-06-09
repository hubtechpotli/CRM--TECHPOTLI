import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { UserAssigneesController } from './user-assignees.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [RedisModule],
  controllers: [UserAssigneesController, UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
