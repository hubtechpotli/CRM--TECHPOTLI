import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  private normalizeAmounts(data: {
    totalAmount?: unknown;
    paidAmount?: unknown;
    bookingAmount?: unknown;
    pendingAmount?: unknown;
    status?: PaymentStatus;
  }) {
    const total = Number(data.totalAmount ?? 0);
    const paid = Number(data.paidAmount ?? 0);
    const pending = Math.max(0, total - paid);
    let status = data.status;
    if (!status) {
      if (paid >= total && total > 0) status = PaymentStatus.PAID;
      else if (paid > 0) status = PaymentStatus.PARTIAL;
      else status = PaymentStatus.PENDING;
    }
    return { total, paid, pending, status };
  }

  findAll() {
    return this.prisma.payment.findMany({
      include: { customer: { select: { id: true, companyName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.payment.findUnique({ where: { id }, include: { customer: true, invoice: true } });
  }

  create(data: Prisma.PaymentUncheckedCreateInput, createdById: string) {
    const { total, paid, pending, status } = this.normalizeAmounts(data);
    return this.prisma.payment.create({
      data: {
        ...data,
        totalAmount: total,
        paidAmount: paid,
        pendingAmount: pending,
        status,
        createdById,
      },
    });
  }

  async update(id: string, data: Prisma.PaymentUpdateInput) {
    const current = await this.prisma.payment.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Payment not found');
    const merged = { ...data } as Prisma.PaymentUncheckedUpdateInput;
    if (data.totalAmount !== undefined || data.paidAmount !== undefined || !data.status) {
      const { total, paid, pending, status } = this.normalizeAmounts({
        totalAmount: data.totalAmount ?? current.totalAmount,
        paidAmount: data.paidAmount ?? current.paidAmount,
        status: (data.status as PaymentStatus) ?? current.status,
      });
      merged.totalAmount = total;
      merged.paidAmount = paid;
      merged.pendingAmount = pending;
      if (!data.status) merged.status = status;
    }
    return this.prisma.payment.update({ where: { id }, data: merged });
  }

  remove(id: string) {
    return this.prisma.payment.delete({ where: { id } });
  }
}
