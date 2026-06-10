import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule, BullModule.registerQueue({ name: 'pdf' })],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
