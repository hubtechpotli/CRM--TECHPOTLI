import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { QuotationsModule } from '../quotations/quotations.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [QuotationsModule, AiModule],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
