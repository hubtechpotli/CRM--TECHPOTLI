import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { SnapshotRefreshService } from './snapshot-refresh.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, SnapshotRefreshService],
  exports: [ReportsService, SnapshotRefreshService],
})
export class ReportsModule {}
