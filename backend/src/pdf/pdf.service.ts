import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';

type PdfDoc = InstanceType<typeof PDFDocument>;

const COMPANY = {
  legalName: 'TECHPOTLI E-COMMERCE PRIVATE LIMITED',
  tagline: 'TECH ON MAKES THINGS EASY',
  phone: '+91 9211405666',
  email: 'support@techpotli.in',
  website: 'www.techpotli.com',
  officeHours: 'Monday to Saturday\n10:00 AM – 6:00 PM',
};

const BANK = {
  bankName: 'ICICI Bank',
  accountName: 'Techpotli E-Commerce Private Limited',
  accountNumber: '347605001436',
  ifsc: 'ICIC0003476',
  swift: 'ICICINBBCTS',
};

const TERMS = [
  'Payment due within 15 days.',
  'GST applicable as per Indian tax regulations.',
  'Delayed payments may incur additional charges.',
  'Services once delivered are non-refundable.',
  'Domain, hosting and third-party charges are non-refundable.',
];

type InvoicePdfInput = {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  customer: {
    companyName: string;
    ownerName?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    state?: string | null;
    pincode?: string | null;
    gstNumber?: string | null;
  };
  lineItems: Array<{ name: string; qty: number; rate: number; amount: number }>;
  subtotal: number;
  discount?: number;
  gstRate: number;
  gstAmount: number;
  grandTotal: number;
};

@Injectable()
export class PdfService {
  private logoPath() {
    const candidates = [
      path.join(process.cwd(), 'assets', 'techpotli-logo.png'),
      path.join(__dirname, '..', '..', 'assets', 'techpotli-logo.png'),
      path.join(__dirname, '..', '..', '..', 'assets', 'techpotli-logo.png'),
    ];
    return candidates.find((p) => fs.existsSync(p));
  }

  private formatMoney(value: number) {
    return `₹ ${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private formatDate(value: Date) {
    return value.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private drawRule(doc: PdfDoc, y: number, weight = 1) {
    const { left, right } = doc.page.margins;
    const width = doc.page.width - left - right;
    doc.save().lineWidth(weight).strokeColor('#1e3a8a').moveTo(left, y).lineTo(left + width, y).stroke().restore();
  }

  private drawSectionTitle(doc: PdfDoc, title: string, y: number) {
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e3a8a').text(title, doc.page.margins.left, y);
    return y + 16;
  }

  private ensureSpace(doc: PdfDoc, needed: number) {
    const bottom = doc.page.height - doc.page.margins.bottom;
    if (doc.y + needed > bottom) doc.addPage();
  }

  /** Label + value rows with dynamic height (fixes overlapping text). */
  private drawFieldRows(
    doc: PdfDoc,
    startY: number,
    left: number,
    contentWidth: number,
    fields: [string, string][],
  ) {
    const labelWidth = 118;
    const valueWidth = contentWidth - labelWidth;
    let y = startY;

    for (const [label, value] of fields) {
      const text = String(value || '—');
      doc.font('Helvetica-Bold').fontSize(9);
      const labelHeight = doc.heightOfString(`${label}:`, { width: labelWidth });
      doc.text(`${label}:`, left, y, { width: labelWidth });

      doc.font('Helvetica').fontSize(9);
      const valueHeight = doc.heightOfString(text, { width: valueWidth });
      doc.text(text, left + labelWidth, y, { width: valueWidth });

      y += Math.max(labelHeight, valueHeight) + 8;
    }

    return y;
  }

  async generateInvoicePdf(data: InvoicePdfInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 45, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const left = doc.page.margins.left;
      const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const discount = data.discount ?? 0;
      const taxableAmount = data.subtotal - discount;
      const halfGst = data.gstAmount / 2;
      const halfRate = data.gstRate / 2;

      let y = doc.page.margins.top;
      const logo = this.logoPath();
      if (logo) {
        doc.image(logo, left, y, { width: 110 });
      }

      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .fillColor('#1e3a8a')
        .text(COMPANY.legalName, left + (logo ? 120 : 0), y + 8, {
          width: contentWidth - (logo ? 120 : 0),
          align: logo ? 'left' : 'center',
        });
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#64748b')
        .text(COMPANY.tagline, left + (logo ? 120 : 0), y + 28, {
          width: contentWidth - (logo ? 120 : 0),
          align: logo ? 'left' : 'center',
        });

      y += logo ? 72 : 48;
      this.drawRule(doc, y, 2);
      y += 14;

      doc.font('Helvetica').fontSize(9).fillColor('#0f172a');
      const metaCol = contentWidth / 3;
      doc.text(`Invoice No: ${data.invoiceNumber}`, left, y, { width: metaCol });
      doc.text(`Invoice Date: ${this.formatDate(data.invoiceDate)}`, left + metaCol, y, { width: metaCol });
      doc.text(`Due Date: ${this.formatDate(data.dueDate)}`, left + metaCol * 2, y, { width: metaCol, align: 'right' });
      y += 22;
      this.drawRule(doc, y);
      y += 14;

      y = this.drawSectionTitle(doc, 'BILL TO', y);
      doc.fillColor('#0f172a');
      y = this.drawFieldRows(doc, y, left, contentWidth, [
        ['Company Name', data.customer.companyName || '—'],
        ['Owner Name', data.customer.ownerName || '—'],
        ['Mobile Number', data.customer.phone || '—'],
        ['Email Address', data.customer.email || '—'],
        ['Address', data.customer.address || '—'],
        ['State', data.customer.state || '—'],
        ['Pincode', data.customer.pincode || '—'],
        ['GST Number', data.customer.gstNumber || '—'],
      ]);

      y += 6;
      this.drawRule(doc, y);
      y += 14;
      y = this.drawSectionTitle(doc, 'SERVICE DETAILS', y);

      const cols = [
        { label: 'Sr', width: 28, align: 'center' as const },
        { label: 'Description', width: contentWidth - 28 - 45 - 70 - 80 },
        { label: 'Qty', width: 45, align: 'center' as const },
        { label: 'Rate', width: 70, align: 'right' as const },
        { label: 'Amount', width: 80, align: 'right' as const },
      ];

      let x = left;
      doc.rect(left, y, contentWidth, 18).fill('#eff6ff');
      doc.fillColor('#1e3a8a').font('Helvetica-Bold').fontSize(8);
      for (const col of cols) {
        doc.text(col.label, x + 4, y + 5, { width: col.width - 8, align: col.align });
        x += col.width;
      }
      y += 20;

      doc.font('Helvetica').fontSize(8).fillColor('#0f172a');
      data.lineItems.forEach((item, index) => {
        this.ensureSpace(doc, 18);
        if (index % 2 === 0) {
          doc.rect(left, y - 2, contentWidth, 16).fill('#f8fafc');
          doc.fillColor('#0f172a');
        }
        x = left;
        const row = [
          String(index + 1),
          item.name,
          String(item.qty),
          this.formatMoney(item.rate),
          this.formatMoney(item.amount),
        ];
        cols.forEach((col, i) => {
          doc.text(row[i], x + 4, y, { width: col.width - 8, align: col.align });
          x += col.width;
        });
        y += 16;
      });

      y += 10;
      this.drawRule(doc, y);
      y += 14;

      const totalsX = left + contentWidth * 0.52;
      const totalsLabelWidth = contentWidth * 0.28;
      const totalsValueWidth = contentWidth * 0.2;
      const totals: [string, string][] = [
        ['Subtotal', this.formatMoney(data.subtotal)],
        ['Discount', this.formatMoney(discount)],
        ['Taxable Amount', this.formatMoney(taxableAmount)],
        [`CGST (${halfRate}%)`, this.formatMoney(halfGst)],
        [`SGST (${halfRate}%)`, this.formatMoney(halfGst)],
      ];

      doc.font('Helvetica').fontSize(9);
      for (const [label, value] of totals) {
        doc.text(label, totalsX, y, { width: totalsLabelWidth });
        doc.text(value, totalsX + totalsLabelWidth, y, { width: totalsValueWidth, align: 'right' });
        y += 14;
      }

      y += 4;
      this.drawRule(doc, y, 1.5);
      y += 10;
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e3a8a');
      doc.text('GRAND TOTAL', totalsX, y, { width: totalsLabelWidth });
      doc.text(this.formatMoney(data.grandTotal), totalsX + totalsLabelWidth, y, {
        width: totalsValueWidth,
        align: 'right',
      });
      y += 24;
      this.drawRule(doc, y);
      y += 14;

      this.ensureSpace(doc, 180);
      y = this.drawSectionTitle(doc, 'BANK DETAILS', y);
      doc.fillColor('#0f172a');
      y = this.drawFieldRows(doc, y, left, contentWidth, [
        ['Bank Name', BANK.bankName],
        ['Account Name', BANK.accountName],
        ['Account Number', BANK.accountNumber],
        ['IFSC Code', BANK.ifsc],
        ['SWIFT Code', BANK.swift],
      ]);

      y += 6;
      this.drawRule(doc, y);
      y += 14;
      y = this.drawSectionTitle(doc, 'COMPANY DETAILS', y);
      doc.font('Helvetica-Bold').fontSize(9).text(COMPANY.legalName, left, y);
      y += 14;
      doc.font('Helvetica').fontSize(9);
      y = this.drawFieldRows(doc, y, left, contentWidth, [
        ['Customer Care', COMPANY.phone],
        ['Email', COMPANY.email],
        ['Website', COMPANY.website],
        ['Office Hours', COMPANY.officeHours.replace('\n', ' · ')],
      ]);
      y += 8;

      this.drawRule(doc, y);
      y += 14;
      y = this.drawSectionTitle(doc, 'TERMS & CONDITIONS', y);
      doc.font('Helvetica').fontSize(8).fillColor('#334155');
      TERMS.forEach((term, i) => {
        doc.text(`${i + 1}. ${term}`, left, y, { width: contentWidth });
        y += 12;
      });

      y += 20;
      this.drawRule(doc, y);
      y += 28;
      doc.font('Helvetica').fontSize(9).fillColor('#0f172a');
      doc.text('Authorized Signatory', left, y);
      y += 36;
      doc.font('Helvetica-Bold').text(COMPANY.legalName, left, y);

      doc.end();
    });
  }
}
