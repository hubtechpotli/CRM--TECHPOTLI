import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Consumer, EachMessagePayload, logLevel } from 'kafkajs';
import { DomainEvent, EventTopic } from './event-topics';

export type MessageHandler = (event: DomainEvent) => Promise<void>;

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private consumers: Consumer[] = [];
  private enabled = false;

  constructor(private config: ConfigService) {
    this.enabled = config.get('ENABLE_KAFKA') === 'true';
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.log('Kafka disabled (set ENABLE_KAFKA=true to enable)');
      return;
    }
    const brokers = (this.config.get<string>('KAFKA_BROKERS') || 'localhost:9092').split(',');
    this.kafka = new Kafka({
      clientId: 'techpotli-crm',
      brokers,
      logLevel: logLevel.ERROR,
      retry: { initialRetryTime: 300, retries: 5 },
    });
    this.producer = this.kafka.producer({ allowAutoTopicCreation: true });
    try {
      await this.producer.connect();
      this.logger.log(`Kafka producer connected (${brokers.join(', ')})`);
    } catch (err) {
      this.logger.warn(`Kafka unavailable: ${(err as Error).message}`);
      this.enabled = false;
    }
  }

  isEnabled() {
    return this.enabled && !!this.producer;
  }

  async ping(): Promise<boolean> {
    if (!this.isEnabled() || !this.kafka) return false;
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      await admin.listTopics();
      await admin.disconnect();
      return true;
    } catch {
      return false;
    }
  }

  async publish<T>(topic: EventTopic, payload: T, metadata?: DomainEvent['metadata']): Promise<DomainEvent<T> | null> {
    if (!this.isEnabled() || !this.producer) return null;
    const event: DomainEvent<T> = {
      id: crypto.randomUUID(),
      topic,
      timestamp: new Date().toISOString(),
      payload,
      metadata,
    };
    try {
      await this.producer.send({
        topic,
        messages: [{ key: event.id, value: JSON.stringify(event) }],
      });
      return event;
    } catch (err) {
      this.logger.error(`Failed to publish ${topic}: ${(err as Error).message}`);
      return null;
    }
  }

  async subscribe(topics: EventTopic[], groupId: string, handler: MessageHandler): Promise<void> {
    if (!this.enabled || !this.kafka) return;
    const consumer = this.kafka.consumer({ groupId });
    await consumer.connect();
    for (const topic of topics) {
      await consumer.subscribe({ topic, fromBeginning: false });
    }
    await consumer.run({
      eachMessage: async ({ message }: EachMessagePayload) => {
        if (!message.value) return;
        try {
          const event = JSON.parse(message.value.toString()) as DomainEvent;
          await handler(event);
        } catch (err) {
          this.logger.error(`Consumer error on ${groupId}: ${(err as Error).message}`);
        }
      },
    });
    this.consumers.push(consumer);
    this.logger.log(`Kafka consumer ${groupId} subscribed to ${topics.join(', ')}`);
  }

  async onModuleDestroy() {
    for (const consumer of this.consumers) {
      await consumer.disconnect().catch(() => undefined);
    }
    if (this.producer) await this.producer.disconnect().catch(() => undefined);
  }
}
