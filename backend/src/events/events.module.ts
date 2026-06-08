import { Global, Module } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { EventPublisherService } from './event-publisher.service';
import { ProcessedEventService } from './processed-event.service';

@Global()
@Module({
  providers: [KafkaService, EventPublisherService, ProcessedEventService],
  exports: [KafkaService, EventPublisherService, ProcessedEventService],
})
export class EventsModule {}
