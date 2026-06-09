import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { EncryptionService } from '../common/encryption.service';
import { PortalModule } from '../portal/portal.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [PortalModule, NotificationsModule, RedisModule],
  controllers: [CustomersController],
  providers: [CustomersService, EncryptionService],
  exports: [CustomersService],
})
export class CustomersModule {}
