import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaReadService } from '../prisma/prisma-read.service';
import { CacheService } from '../redis/cache.service';
import { OllamaService } from '../ai/ollama.service';
import { isLeadAdmin } from '../leads/lead-access';

@Injectable()
export class SearchService {
  constructor(
    private prisma: PrismaService,
    private prismaRead: PrismaReadService,
    private cache: CacheService,
    private ollama: OllamaService,
  ) {}

  async search(q: string, userRole?: string, userId?: string) {
    const term = q.trim();
    if (!term) return { customers: [], leads: [], projects: [], invoices: [], users: [], semantic: [] };

    const cacheKey = `search:${term.toLowerCase()}:${userRole ?? 'anon'}:${userId ?? ''}`;
    return this.cache.wrap(cacheKey, 60, async () => {
      const [keyword, semantic] = await Promise.all([
        this.keywordSearch(term, userRole, userId),
        this.semanticSearch(term, userRole, userId),
      ]);
      return { ...keyword, semantic };
    });
  }

  private leadScopeSql(userRole?: string, userId?: string) {
    if (userRole === UserRole.EMPLOYEE && userId) {
      return Prisma.sql`AND "assignedToId" = ${userId}`;
    }
    return Prisma.empty;
  }

  private leadWhere(userRole?: string, userId?: string): Prisma.LeadWhereInput {
    if (userRole === UserRole.EMPLOYEE && userId) {
      return { assignedToId: userId };
    }
    return {};
  }

  private async keywordSearch(term: string, userRole?: string, userId?: string) {
    const tsQuery = term.split(/\s+/).filter(Boolean).join(' & ');
    const leadScope = this.leadScopeSql(userRole, userId);
    try {
      const [customers, leads, projects, invoices, users] = await Promise.all([
        this.prismaRead.$queryRaw<
          { id: string; companyName: string; ownerName: string; phone: string }[]
        >`
          SELECT id, "companyName", "ownerName", phone FROM "Customer"
          WHERE to_tsvector('english', coalesce("companyName",'') || ' ' || coalesce("ownerName",'') || ' ' || coalesce(phone,'') || ' ' || coalesce(email,''))
          @@ plainto_tsquery('english', ${term})
          LIMIT 10`,
        this.prismaRead.$queryRaw<
          { id: string; companyName: string; contactName: string; status: string }[]
        >`
          SELECT id, "companyName", "contactName", status::text FROM "Lead"
          WHERE to_tsvector('english', coalesce("companyName",'') || ' ' || coalesce("contactName",'') || ' ' || coalesce(phone,''))
          @@ plainto_tsquery('english', ${term})
          ${leadScope}
          LIMIT 10`,
        this.prismaRead.$queryRaw<{ id: string; name: string; status: string }[]>`
          SELECT id, name, status::text FROM "Project"
          WHERE to_tsvector('english', coalesce(name,'') || ' ' || coalesce("briefNotes",''))
          @@ plainto_tsquery('english', ${term})
          LIMIT 10`,
        this.prismaRead.$queryRaw<{ id: string; invoiceNumber: string; status: string; grandTotal: unknown }[]>`
          SELECT id, "invoiceNumber", status::text, "grandTotal" FROM "Invoice"
          WHERE to_tsvector('english', coalesce("invoiceNumber",'') || ' ' || coalesce(notes,''))
          @@ plainto_tsquery('english', ${tsQuery || term})
          LIMIT 10`,
        this.prismaRead.$queryRaw<{ id: string; name: string; email: string; role: string }[]>`
          SELECT id, name, email, role::text FROM "User"
          WHERE to_tsvector('english', coalesce(name,'') || ' ' || coalesce(email,''))
          @@ plainto_tsquery('english', ${term})
          LIMIT 10`,
      ]);
      return { customers, leads, projects, invoices, users };
    } catch {
      return this.fallbackSearch(term, userRole, userId);
    }
  }

  private async fallbackSearch(term: string, userRole?: string, userId?: string) {
    const contains = { contains: term, mode: 'insensitive' as const };
    const leadScope = this.leadWhere(userRole, userId);
    const [customers, leads, projects, invoices, users] = await Promise.all([
      this.prisma.customer.findMany({
        where: { OR: [{ companyName: contains }, { ownerName: contains }, { phone: { contains: term } }, { email: contains }] },
        take: 10,
        select: { id: true, companyName: true, ownerName: true, phone: true },
      }),
      this.prisma.lead.findMany({
        where: {
          ...leadScope,
          OR: [{ companyName: contains }, { contactName: contains }, { phone: { contains: term } }],
        },
        take: 10,
        select: { id: true, companyName: true, contactName: true, status: true },
      }),
      this.prisma.project.findMany({
        where: { name: contains },
        take: 10,
        select: { id: true, name: true, status: true },
      }),
      this.prisma.invoice.findMany({
        where: { invoiceNumber: contains },
        take: 10,
        select: { id: true, invoiceNumber: true, status: true, grandTotal: true },
      }),
      isLeadAdmin(userRole ?? '')
        ? this.prisma.user.findMany({
            where: { OR: [{ name: contains }, { email: contains }] },
            take: 10,
            select: { id: true, name: true, email: true, role: true },
          })
        : Promise.resolve([]),
    ]);
    return { customers, leads, projects, invoices, users };
  }

  private async semanticSearch(term: string, userRole?: string, userId?: string) {
    const vector = await this.ollama.embed(term);
    if (!vector.length) return [];
    const vectorStr = `[${vector.join(',')}]`;
    try {
      const rows = await this.prismaRead.$queryRaw<
        { entityType: string; entityId: string; score: number }[]
      >`
        SELECT "entityType", "entityId", 1 - (vector <=> ${vectorStr}::vector) AS score
        FROM "EmbeddingRecord"
        WHERE vector IS NOT NULL
        ORDER BY vector <=> ${vectorStr}::vector
        LIMIT 8`;
      const results: { type: string; id: string; label: string; score: number }[] = [];
      for (const row of rows) {
        if (row.entityType === 'lead') {
          const lead = await this.prisma.lead.findUnique({
            where: { id: row.entityId },
            select: { companyName: true, assignedToId: true },
          });
          if (!lead) continue;
          if (userRole === UserRole.EMPLOYEE && userId && lead.assignedToId !== userId) continue;
          results.push({ type: 'lead', id: row.entityId, label: lead.companyName, score: Number(row.score) });
        } else if (row.entityType === 'customer') {
          const customer = await this.prisma.customer.findUnique({
            where: { id: row.entityId },
            select: { companyName: true },
          });
          if (customer) results.push({ type: 'customer', id: row.entityId, label: customer.companyName, score: Number(row.score) });
        }
      }
      return results;
    } catch {
      return [];
    }
  }
}
