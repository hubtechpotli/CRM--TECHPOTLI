import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RenewalsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.renewal.findMany({
      include: { customer: { select: { id: true, companyName: true } } },
      orderBy: { renewalDate: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.renewal.findUnique({ where: { id }, include: { customer: true } });
  }

  create(data: Prisma.RenewalCreateInput) {
    return this.prisma.renewal.create({ data });
  }

  update(id: string, data: Prisma.RenewalUpdateInput) {
    return this.prisma.renewal.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.renewal.delete({ where: { id } });
  }
}
