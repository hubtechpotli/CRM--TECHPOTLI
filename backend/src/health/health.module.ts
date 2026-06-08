import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [HealthController],
})
export class HealthModule {}
