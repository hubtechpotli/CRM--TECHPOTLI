import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProcessedEventService {
  constructor(private prisma: PrismaService) {}

  async isProcessed(eventId: string): Promise<boolean> {
    const existing = await this.prisma.processedEvent.findUnique({ where: { id: eventId } });
    return !!existing;
  }

  async markProcessed(eventId: string, topic: string): Promise<boolean> {
    try {
      await this.prisma.processedEvent.create({ data: { id: eventId, topic } });
      return true;
    } catch {
      return false;
    }
  }
}
