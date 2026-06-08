import { Injectable, OnModuleInit } from '@nestjs/common';
import { KafkaService } from '../events/kafka.service';
import { EVENT_TOPICS } from '../events/event-topics';
import { WorkflowService } from './workflow.service';
import { shouldRunKafkaConsumers } from '../events/consumer.util';

@Injectable()
export class WorkflowConsumersService implements OnModuleInit {
  constructor(
    private kafka: KafkaService,
    private workflow: WorkflowService,
  ) {}

  async onModuleInit() {
    if (!this.kafka.isEnabled() || !shouldRunKafkaConsumers()) return;
    const topics = Object.values(EVENT_TOPICS).filter((t) => t !== EVENT_TOPICS.DLQ);
    await this.kafka.subscribe(topics, 'techpotli-workflow-engine', (event) =>
      this.workflow.processEvent(event),
    );
  }
}
