import { BadGatewayException, BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { PrismaService } from '../prisma/prisma.service';
import { isFullHtmlDocument, wrapEmailBodyFragment } from './templates/email-layout.template';

export type MailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

type MailProvider = 'resend' | 'gmail' | 'none';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private provider: MailProvider = 'none';
  private resend: Resend | null = null;
  private transporter: nodemailer.Transporter | null = null;
  private fromAddress = 'noreply@techpotli.com';

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.init();
  }

  getProvider(): MailProvider {
    return this.provider;
  }

  private init() {
    const fromName = this.config.get('MAIL_FROM_NAME') || 'TechPotli';
    const resendKey = this.config.get('RESEND_API_KEY');
    const resendFrom = this.config.get('RESEND_FROM_EMAIL');
    const gmailUser = this.config.get('GMAIL_USER');
    const gmailPass = this.config.get('GMAIL_APP_PASSWORD');

    if (resendKey) {
      this.resend = new Resend(resendKey);
      this.fromAddress = resendFrom
        ? `${fromName} <${resendFrom}>`
        : `${fromName} <onboarding@resend.dev>`;
      this.provider = 'resend';
      this.logger.log(`Email via Resend (${resendFrom || 'onboarding@resend.dev'})`);
      return;
    }

    if (gmailUser && gmailPass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass },
      });
      this.fromAddress = `${fromName} <${gmailUser}>`;
      this.provider = 'gmail';
      this.logger.log(`Email via Gmail (${gmailUser})`);
      return;
    }

    this.logger.warn('Email disabled — set RESEND_API_KEY or GMAIL_USER + GMAIL_APP_PASSWORD');
  }

  private resendTestRecipient(): string | null {
    if (!this.fromAddress.includes('onboarding@resend.dev')) return null;
    return this.config.get('RESEND_TEST_TO') || 'onboarding@techpotli.com';
  }

  async send(to: string, subject: string, html: string, attachments?: MailAttachment[]) {
    // Production guardrail: ensure every outgoing email uses the branded CRM template.
    // If a caller passes a fragment (<p>...</p>), we wrap it into the full template.
    const finalHtml = isFullHtmlDocument(html)
      ? html
      : wrapEmailBodyFragment(html, subject);

    if (this.provider === 'none') {
      this.logger.warn(`Email skipped (not configured): ${subject} → ${to}`);
      return { skipped: true };
    }

    const testRecipient = this.resendTestRecipient();
    if (testRecipient && to.toLowerCase() !== testRecipient.toLowerCase()) {
      throw new BadRequestException(
        `Resend test mode: you can only send to ${testRecipient}. ` +
          `Update the customer email to that address, or verify your domain at resend.com/domains and set RESEND_FROM_EMAIL=support@techpotli.com`,
      );
    }

    if (this.provider === 'resend' && this.resend) {
      const { data, error } = await this.resend.emails.send({
        from: this.fromAddress,
        to: [to],
        subject,
        html: finalHtml,
        replyTo: this.config.get('RESEND_REPLY_TO') || undefined,
        attachments: attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      });
      if (error) {
        const hint =
          this.fromAddress.includes('onboarding@resend.dev')
            ? ' Resend test sender only works to your verified inbox until you verify your domain and set RESEND_FROM_EMAIL=support@techpotli.com'
            : '';
        this.logger.error(`Resend failed: ${error.message} (${subject} → ${to})${hint}`);
        throw new BadGatewayException(`${error.message}${hint}`);
      }
      return { id: data?.id, provider: 'resend' };
    }

    return this.transporter!.sendMail({
      from: this.fromAddress,
      to,
      subject,
      html: finalHtml,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
  }

  async sendToUser(userId: string, subject: string, html: string, attachments?: MailAttachment[]) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (user?.email) return this.send(user.email, subject, html, attachments);
  }
}
