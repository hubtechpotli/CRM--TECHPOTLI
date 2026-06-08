import { Module } from '@nestjs/common';
import { EmailController } from './email.controller';
import { EmailComposerService } from './email-composer.service';
import { AiModule } from '../ai/ai.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [AiModule, CustomersModule],
  controllers: [EmailController],
  providers: [EmailComposerService],
})
export class EmailModule {}
