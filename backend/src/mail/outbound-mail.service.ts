import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as sgMail from '@sendgrid/mail';

export type TransactionalMailParams = {
  toEmail: string;
  toName?: string;
  subject: string;
  text: string;
  html: string;
  /** Logged when SMTP/SendGrid is not configured (e.g. dev). */
  devLog?: { label: string; detail: string };
};

@Injectable()
export class OutboundMailService {
  private readonly logger = new Logger(OutboundMailService.name);

  constructor(private readonly config: ConfigService) {}

  outboundFrom(): string | { email: string; name?: string } {
    const email =
      this.config.get<string>('EMAIL_FROM')?.trim() || 'no-reply@makulutu.local';
    const name = this.config.get<string>('EMAIL_FROM_NAME')?.trim();
    if (name) return { email, name };
    return email;
  }

  private outboundReplyTo(): { email: string } | undefined {
    const email = this.config.get<string>('EMAIL_REPLY_TO')?.trim();
    if (!email) return undefined;
    return { email };
  }

  async sendTransactional(params: TransactionalMailParams): Promise<void> {
    const toAddr = params.toEmail.trim().toLowerCase();
    const recipientName = params.toName?.trim() || '';
    const from = this.outboundFrom();
    const replyTo = this.outboundReplyTo();
    const sendgridKey = this.config.get<string>('SENDGRID_API_KEY')?.trim();
    if (sendgridKey) {
      sgMail.setApiKey(sendgridKey);
      await sgMail.send({
        from,
        to: recipientName
          ? { email: toAddr, name: recipientName }
          : toAddr,
        ...(replyTo && { replyTo }),
        subject: params.subject,
        text: params.text,
        html: params.html,
      });
      return;
    }

    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const port = Number(this.config.get<string>('SMTP_PORT') || '587');
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS')?.trim();
    if (!host || !user || !pass || !Number.isFinite(port)) {
      if (params.devLog) {
        this.logger.warn(
          `No email transport (set SENDGRID_API_KEY or SMTP_*); ${params.devLog.label}: ${params.devLog.detail}`,
        );
      }
      return;
    }
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    const nodemailerFrom =
      typeof from === 'string' ? from : `${from.name} <${from.email}>`;
    await transporter.sendMail({
      from: nodemailerFrom,
      to: recipientName
        ? { name: recipientName, address: toAddr }
        : toAddr,
      ...(replyTo && { replyTo: replyTo.email }),
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
  }
}
