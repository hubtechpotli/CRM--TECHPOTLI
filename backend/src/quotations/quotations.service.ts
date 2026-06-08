import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, QuotationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NumberSequenceService } from '../common/number-sequence.service';

export type CreateQuotationInput = {
  leadId?: string;
  customerId?: string;
  lineItems: unknown[];
  validUntil: Date;
  clientName?: string;
  clientEmail?: string;
  notes?: string;
  gstRate?: number;
  status?: QuotationStatus;
};

@Injectable()
export class QuotationsService {
  constructor(
    private prisma: PrismaService,
    private numbers: NumberSequenceService,
  ) {}

  findAll() {
    return this.prisma.quotation.findMany({
      include: {
        lead: { select: { id: true, companyName: true } },
        customer: { select: { id: true, companyName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.quotation.findUnique({
      where: { id },
      include: {
        lead: { select: { id: true, companyName: true, contactName: true, email: true } },
        customer: { select: { id: true, companyName: true, email: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  async create(data: CreateQuotationInput, createdById: string) {
    const settings = await this.prisma.systemSettings.findUnique({ where: { id: 'default' } });
    const gstRate = data.gstRate ?? Number(settings?.gstRate ?? 18);
    const lineItems = data.lineItems as Array<{ name: string; qty: number; rate: number; amount: number }>;
    const subtotal = lineItems.reduce((s, i) => s + i.amount, 0);
    const gstAmount = Math.round(subtotal * gstRate) / 100;
    const grandTotal = subtotal + gstAmount;
    const quotationNumber = await this.numbers.next('QUO');

    return this.prisma.quotation.create({
      data: {
        quotationNumber,
        leadId: data.leadId,
        customerId: data.customerId,
        lineItems,
        subtotal,
        gstAmount,
        grandTotal,
        validUntil: data.validUntil,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        notes: data.notes,
        status: data.status ?? QuotationStatus.DRAFT,
        createdById,
      },
      include: {
        lead: { select: { id: true, companyName: true } },
        customer: { select: { id: true, companyName: true } },
      },
    });
  }

  update(id: string, data: Prisma.QuotationUpdateInput) {
    return this.prisma.quotation.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.quotation.delete({ where: { id } });
  }

  async approveByToken(token: string) {
    const q = await this.prisma.quotation.findUnique({ where: { approvalToken: token } });
    if (!q) throw new NotFoundException('Quotation not found');
    return this.prisma.quotation.update({
      where: { approvalToken: token },
      data: { status: QuotationStatus.APPROVED, approvedAt: new Date() },
    });
  }
}
