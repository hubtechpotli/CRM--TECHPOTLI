import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomerSummaryRefreshService } from './customer-summary-refresh.service';
import { EncryptionService } from '../common/encryption.service';
import { PortalModule } from '../portal/portal.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RedisModule } from '../redis/redis.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [PortalModule, NotificationsModule, RedisModule, SearchModule],
  controllers: [CustomersController],
  providers: [CustomersService, CustomerSummaryRefreshService, EncryptionService],
  exports: [CustomersService, CustomerSummaryRefreshService],
})
export class CustomersModule {}
