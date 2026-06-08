import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApprovalsService {
  constructor(private prisma: PrismaService) {}

  listPending() {
    return this.prisma.approvalRequest.findMany({
      where: { status: 'PENDING' },
      include: { requestedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(id: string, reviewedById: string) {
    const req = await this.prisma.approvalRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Approval request not found');
    return this.prisma.approvalRequest.update({
      where: { id },
      data: { status: 'APPROVED', reviewedById, reviewedAt: new Date() },
    });
  }

  async reject(id: string, reviewedById: string, rejectionReason?: string) {
    const req = await this.prisma.approvalRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Approval request not found');
    return this.prisma.approvalRequest.update({
      where: { id },
      data: { status: 'REJECTED', reviewedById, reviewedAt: new Date(), rejectionReason },
    });
  }
}
