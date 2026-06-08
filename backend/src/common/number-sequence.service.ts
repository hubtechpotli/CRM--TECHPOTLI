import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Prefix = 'WO' | 'INV' | 'QUO' | 'TKT';

@Injectable()
export class NumberSequenceService {
  constructor(private prisma: PrismaService) {}

  async next(prefix: Prefix): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await this.prisma.numberSequence.upsert({
      where: { prefix_year: { prefix, year } },
      update: { lastNumber: { increment: 1 } },
      create: { prefix, year, lastNumber: 1 },
    });
    return `${prefix}-${year}-${seq.lastNumber.toString().padStart(4, '0')}`;
  }
}
