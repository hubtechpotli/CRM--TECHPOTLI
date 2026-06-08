import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.expense.findMany({ orderBy: { date: 'desc' }, include: { paidBy: { select: { id: true, name: true } } } });
  }

  findOne(id: string) {
    return this.prisma.expense.findUnique({ where: { id } });
  }

  create(data: Prisma.ExpenseCreateInput, paidById: string) {
    return this.prisma.expense.create({ data: { ...data, paidBy: { connect: { id: paidById } } } });
  }

  update(id: string, data: Prisma.ExpenseUpdateInput) {
    return this.prisma.expense.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.expense.delete({ where: { id } });
  }

  approve(id: string, approvedById: string) {
    return this.prisma.expense.update({ where: { id }, data: { status: 'APPROVED', approvedById } });
  }

  reject(id: string, approvedById: string) {
    return this.prisma.expense.update({ where: { id }, data: { status: 'REJECTED', approvedById } });
  }
}
