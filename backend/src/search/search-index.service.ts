import { Injectable, Logger } from '@nestjs/common';
import { CustomerStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type SearchEntityType = 'CUSTOMER' | 'LEAD' | 'PROJECT' | 'INVOICE' | 'USER';

@Injectable()
export class SearchIndexService {
  private readonly logger = new Logger(SearchIndexService.name);

  constructor(private prisma: PrismaService) {}

  async rebuildAll(): Promise<void> {
    await this.prisma.searchIndex.deleteMany();
    const [customers, leads, projects, invoices, users] = await Promise.all([
      this.prisma.customer.findMany({
        select: { id: true, companyName: true, ownerName: true, phone: true, email: true },
      }),
      this.prisma.lead.findMany({
        select: { id: true, companyName: true, contactName: true, phone: true, assignedToId: true },
      }),
      this.prisma.project.findMany({
        select: { id: true, name: true, briefNotes: true },
      }),
      this.prisma.invoice.findMany({
        select: { id: true, invoiceNumber: true, notes: true },
      }),
      this.prisma.user.findMany({
        select: { id: true, name: true, email: true },
      }),
    ]);

    const now = new Date();
    const rows: Prisma.SearchIndexCreateManyInput[] = [
      ...customers.map((c) => ({
        entityType: 'CUSTOMER',
        entityId: c.id,
        title: c.companyName,
        subtitle: c.ownerName,
        searchText: [c.phone, c.email].filter(Boolean).join(' '),
        updatedAt: now,
      })),
      ...leads.map((l) => ({
        entityType: 'LEAD',
        entityId: l.id,
        title: l.companyName,
        subtitle: l.contactName,
        searchText: l.phone ?? '',
        assignedToId: l.assignedToId,
        updatedAt: now,
      })),
      ...projects.map((p) => ({
        entityType: 'PROJECT',
        entityId: p.id,
        title: p.name,
        subtitle: null,
        searchText: p.briefNotes ?? '',
        updatedAt: now,
      })),
      ...invoices.map((i) => ({
        entityType: 'INVOICE',
        entityId: i.id,
        title: i.invoiceNumber,
        subtitle: null,
        searchText: i.notes ?? '',
        updatedAt: now,
      })),
      ...users.map((u) => ({
        entityType: 'USER',
        entityId: u.id,
        title: u.name,
        subtitle: u.email,
        searchText: u.email,
        updatedAt: now,
      })),
    ];

    if (rows.length) {
      await this.prisma.searchIndex.createMany({ data: rows });
    }
    this.logger.log(`Search index rebuilt (${rows.length} rows)`);
  }

  async upsertCustomer(customerId: string) {
    const c = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, companyName: true, ownerName: true, phone: true, email: true },
    });
    if (!c) {
      await this.deleteEntity('CUSTOMER', customerId);
      return;
    }
    await this.upsertRow({
      entityType: 'CUSTOMER',
      entityId: c.id,
      title: c.companyName,
      subtitle: c.ownerName,
      searchText: [c.phone, c.email].filter(Boolean).join(' '),
    });
  }

  async upsertLead(leadId: string) {
    const l = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, companyName: true, contactName: true, phone: true, assignedToId: true },
    });
    if (!l) {
      await this.deleteEntity('LEAD', leadId);
      return;
    }
    await this.upsertRow({
      entityType: 'LEAD',
      entityId: l.id,
      title: l.companyName,
      subtitle: l.contactName,
      searchText: l.phone ?? '',
      assignedToId: l.assignedToId,
    });
  }

  async upsertProject(projectId: string) {
    const p = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, briefNotes: true },
    });
    if (!p) {
      await this.deleteEntity('PROJECT', projectId);
      return;
    }
    await this.upsertRow({
      entityType: 'PROJECT',
      entityId: p.id,
      title: p.name,
      subtitle: null,
      searchText: p.briefNotes ?? '',
    });
  }

  async upsertInvoice(invoiceId: string) {
    const i = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, invoiceNumber: true, notes: true },
    });
    if (!i) {
      await this.deleteEntity('INVOICE', invoiceId);
      return;
    }
    await this.upsertRow({
      entityType: 'INVOICE',
      entityId: i.id,
      title: i.invoiceNumber,
      subtitle: null,
      searchText: i.notes ?? '',
    });
  }

  async upsertUser(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    if (!u) {
      await this.deleteEntity('USER', userId);
      return;
    }
    await this.upsertRow({
      entityType: 'USER',
      entityId: u.id,
      title: u.name,
      subtitle: u.email,
      searchText: u.email,
    });
  }

  async deleteEntity(entityType: SearchEntityType, entityId: string) {
    await this.prisma.searchIndex.deleteMany({ where: { entityType, entityId } });
  }

  async searchCustomerDirectory(
    term: string,
    filters: { status?: CustomerStatus; state?: string; assignedEmployeeId?: string },
    page: number,
    limit: number,
  ): Promise<{ ids: string[]; total: number }> {
    const offset = Math.max(0, (page - 1) * limit);
    const statusCond = filters.status
      ? Prisma.sql`AND c.status = ${filters.status}::"CustomerStatus"`
      : Prisma.empty;
    const stateCond = filters.state ? Prisma.sql`AND c.state = ${filters.state}` : Prisma.empty;
    const assigneeCond = filters.assignedEmployeeId
      ? Prisma.sql`AND c."assignedEmployeeId" = ${filters.assignedEmployeeId}`
      : Prisma.empty;

    const [rows, countRows] = await Promise.all([
      this.prisma.$queryRaw<Array<{ entityId: string }>>`
        SELECT si."entityId"
        FROM "SearchIndex" si
        INNER JOIN "Customer" c ON c.id = si."entityId"
        WHERE si."entityType" = 'CUSTOMER'
          AND to_tsvector(
            'english',
            coalesce(si.title, '') || ' ' || coalesce(si.subtitle, '') || ' ' || coalesce(si."searchText", '')
          ) @@ plainto_tsquery('english', ${term})
          ${statusCond}
          ${stateCond}
          ${assigneeCond}
        ORDER BY si."updatedAt" DESC
        LIMIT ${limit} OFFSET ${offset}`,
      this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM "SearchIndex" si
        INNER JOIN "Customer" c ON c.id = si."entityId"
        WHERE si."entityType" = 'CUSTOMER'
          AND to_tsvector(
            'english',
            coalesce(si.title, '') || ' ' || coalesce(si.subtitle, '') || ' ' || coalesce(si."searchText", '')
          ) @@ plainto_tsquery('english', ${term})
          ${statusCond}
          ${stateCond}
          ${assigneeCond}`,
    ]);

    return {
      ids: rows.map((r) => r.entityId),
      total: Number(countRows[0]?.count ?? 0),
    };
  }

  async keywordSearchFromIndex(term: string, userRole?: string, userId?: string) {
    const employeeLeadFilter =
      userRole === UserRole.EMPLOYEE && userId
        ? Prisma.sql`AND (si."entityType" != 'LEAD' OR si."assignedToId" = ${userId})`
        : Prisma.empty;

    const userFilter =
      userRole === UserRole.EMPLOYEE ? Prisma.sql`AND si."entityType" != 'USER'` : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      Array<{ entityType: string; entityId: string; title: string; subtitle: string | null }>
    >`
      SELECT si."entityType", si."entityId", si.title, si.subtitle
      FROM "SearchIndex" si
      WHERE to_tsvector('english', coalesce(si.title, '') || ' ' || coalesce(si.subtitle, '') || ' ' || coalesce(si."searchText", ''))
        @@ plainto_tsquery('english', ${term})
      ${employeeLeadFilter}
      ${userFilter}
      ORDER BY si."updatedAt" DESC
      LIMIT 50`;

    const customers: unknown[] = [];
    const leads: unknown[] = [];
    const projects: unknown[] = [];
    const invoices: unknown[] = [];
    const users: unknown[] = [];

    for (const row of rows) {
      switch (row.entityType) {
        case 'CUSTOMER':
          customers.push({ id: row.entityId, companyName: row.title, ownerName: row.subtitle, phone: '' });
          break;
        case 'LEAD':
          leads.push({ id: row.entityId, companyName: row.title, contactName: row.subtitle, status: '' });
          break;
        case 'PROJECT':
          projects.push({ id: row.entityId, name: row.title, status: '' });
          break;
        case 'INVOICE':
          invoices.push({ id: row.entityId, invoiceNumber: row.title, status: '', grandTotal: 0 });
          break;
        case 'USER':
          users.push({ id: row.entityId, name: row.title, email: row.subtitle ?? '', role: '' });
          break;
        default:
          break;
      }
    }

    return { customers, leads, projects, invoices, users };
  }

  private async upsertRow(data: {
    entityType: SearchEntityType;
    entityId: string;
    title: string;
    subtitle: string | null;
    searchText: string;
    assignedToId?: string | null;
  }) {
    const now = new Date();
    await this.prisma.searchIndex.upsert({
      where: { entityType_entityId: { entityType: data.entityType, entityId: data.entityId } },
      create: {
        entityType: data.entityType,
        entityId: data.entityId,
        title: data.title,
        subtitle: data.subtitle,
        searchText: data.searchText,
        assignedToId: data.assignedToId ?? null,
        updatedAt: now,
      },
      update: {
        title: data.title,
        subtitle: data.subtitle,
        searchText: data.searchText,
        assignedToId: data.assignedToId ?? null,
        updatedAt: now,
      },
    });
  }
}
