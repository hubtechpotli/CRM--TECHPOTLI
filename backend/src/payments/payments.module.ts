import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { UploadsModule } from '../uploads/uploads.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [UploadsModule, InvoicesModule, RedisModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
