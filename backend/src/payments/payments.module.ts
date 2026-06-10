import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { UploadsModule } from '../uploads/uploads.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [UploadsModule, InvoicesModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
