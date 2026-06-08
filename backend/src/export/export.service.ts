import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  async toExcel(module: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(module);
    const rows = await this.getRows(module);
    if (rows.length) {
      sheet.columns = Object.keys(rows[0]).map((k) => ({ header: k, key: k, width: 20 }));
      sheet.addRows(rows);
    }
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async toPdf(module: string): Promise<Buffer> {
    const rows = await this.getRows(module);
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.fontSize(16).text(`${module.toUpperCase()} Export`, { underline: true });
      doc.moveDown();
      rows.slice(0, 50).forEach((row, i) => {
        doc.fontSize(9).text(`${i + 1}. ${JSON.stringify(row)}`);
      });
      doc.end();
    });
  }

  private async getRows(module: string): Promise<Record<string, unknown>[]> {
    switch (module) {
      case 'customers':
        return this.prisma.customer.findMany({ take: 1000 }) as Promise<Record<string, unknown>[]>;
      case 'leads':
        return this.prisma.lead.findMany({ take: 1000 }) as Promise<Record<string, unknown>[]>;
      case 'invoices':
        return this.prisma.invoice.findMany({ take: 1000 }) as Promise<Record<string, unknown>[]>;
      case 'payments':
        return this.prisma.payment.findMany({ take: 1000 }) as Promise<Record<string, unknown>[]>;
      case 'expenses':
        return this.prisma.expense.findMany({ take: 1000 }) as Promise<Record<string, unknown>[]>;
      default:
        return [];
    }
  }
}
