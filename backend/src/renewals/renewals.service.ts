import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RenewalsService {
  constructor(private prisma: PrismaService) {}

  async findAll(opts?: { page?: number; limit?: number }) {
    const limit = Math.min(opts?.limit ?? parseInt(process.env.DEFAULT_LIST_LIMIT || '20', 10), 100);
    const page = Math.max(1, opts?.page ?? 1);
    const skip = (page - 1) * limit;
    const [totalCount, data] = await Promise.all([
      this.prisma.renewal.count(),
      this.prisma.renewal.findMany({
        include: { customer: { select: { id: true, companyName: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
    ]);
    return {
      data,
      totalCount,
      page,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      limit,
      hasMore: page * limit < totalCount,
    };
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
