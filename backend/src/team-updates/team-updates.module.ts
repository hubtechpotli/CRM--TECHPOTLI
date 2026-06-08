import { Module } from '@nestjs/common';
import { TeamUpdatesController } from './team-updates.controller';
import { TeamUpdatesService } from './team-updates.service';

@Module({
  controllers: [TeamUpdatesController],
  providers: [TeamUpdatesService],
})
export class TeamUpdatesModule {}
