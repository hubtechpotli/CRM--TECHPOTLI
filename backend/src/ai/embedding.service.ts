import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OllamaService } from './ollama.service';

@Injectable()
export class EmbeddingService {
  constructor(
    private prisma: PrismaService,
    private ollama: OllamaService,
  ) {}

  buildLeadText(lead: {
    companyName: string;
    contactName: string;
    phone?: string;
    email?: string | null;
    source?: string;
    interestedServices?: string[];
    remarks?: string | null;
    status?: string;
  }) {
    return [
      lead.companyName,
      lead.contactName,
      lead.phone,
      lead.email,
      lead.source,
      lead.interestedServices?.join(' '),
      lead.remarks,
      lead.status,
    ]
      .filter(Boolean)
      .join(' ');
  }

  buildCustomerText(customer: {
    companyName: string;
    ownerName: string;
    email?: string | null;
    phone?: string;
    natureOfBusiness?: string | null;
    tags?: string[];
  }) {
    return [
      customer.companyName,
      customer.ownerName,
      customer.email,
      customer.phone,
      customer.natureOfBusiness,
      customer.tags?.join(' '),
    ]
      .filter(Boolean)
      .join(' ');
  }

  async upsertEmbedding(entityType: string, entityId: string, text: string) {
    try {
      const vector = await this.ollama.embed(text);
      if (!vector.length) return;
      const vectorStr = `[${vector.join(',')}]`;
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "EmbeddingRecord" ("id", "entityType", "entityId", "vector", "updatedAt")
         VALUES ($1, $2, $3, $4::vector, NOW())
         ON CONFLICT ("entityType", "entityId")
         DO UPDATE SET "vector" = $4::vector, "updatedAt" = NOW()`,
        crypto.randomUUID(),
        entityType,
        entityId,
        vectorStr,
      );
    } catch {
      /* pgvector or Ollama unavailable — semantic search falls back to FTS */
    }
  }
}
