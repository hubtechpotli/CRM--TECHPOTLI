import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { TeamUpdatesController } from './team-updates.controller';
import { TeamUpdatesService } from './team-updates.service';

@Module({
  imports: [RedisModule],
  controllers: [TeamUpdatesController],
  providers: [TeamUpdatesService],
})
export class TeamUpdatesModule {}
