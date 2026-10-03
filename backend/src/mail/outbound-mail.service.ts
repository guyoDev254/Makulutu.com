import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
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

const SMTP_CONNECT_MS = 15_000;

@Injectable()
export class OutboundMailService {
  private readonly logger = new Logger(OutboundMailService.name);
  private smtpTransporter: nodemailer.Transporter | null = null;

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

  /** Do not await this on HTTP request paths — SMTP can stall for a long time. */
  sendInBackground(params: TransactionalMailParams): void {
    void this.sendTransactional(params).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Background mail failed: ${message}`);
    });
  }

  async sendTransactional(params: TransactionalMailParams): Promise<void> {
    const toAddr = params.toEmail.trim().toLowerCase();
    const recipientName = params.toName?.trim() || '';
    const from = this.outboundFrom();
    const replyTo = this.outboundReplyTo();

    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const port = Number(this.config.get<string>('SMTP_PORT') || '587');
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS')?.trim();
    const smtpReady = Boolean(host && user && pass && Number.isFinite(port));

    if (smtpReady) {
      try {
        const transporter = this.getSmtpTransporter(host as string, port, user as string, pass as string);
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
        return;
      } catch (err) {
        this.smtpTransporter = null;
        const cause = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Cannot reach SMTP ${host}:${port} (${cause})`);
        if (params.devLog) {
          this.logger.warn(
            `Mail not sent (${params.devLog.label}): ${params.devLog.detail}`,
          );
        }
        return;
      }
    }

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

    if (params.devLog) {
      this.logger.warn(
        `No email transport (set SMTP_HOST/SMTP_USER/SMTP_PASS); ${params.devLog.label}: ${params.devLog.detail}`,
      );
    }
  }

  private getSmtpTransporter(
    host: string,
    port: number,
    user: string,
    pass: string,
  ): nodemailer.Transporter {
    if (!this.smtpTransporter) {
      const options: SMTPTransport.Options = {
        host,
        port,
        secure: port === 465,
        requireTLS: port === 587,
        auth: { user, pass },
        connectionTimeout: SMTP_CONNECT_MS,
        greetingTimeout: SMTP_CONNECT_MS,
        socketTimeout: 25_000,
      };
      this.smtpTransporter = nodemailer.createTransport({
        ...options,
        family: 4,
      } as SMTPTransport.Options);
      this.logger.log(`Outbound mail via SMTP ${host}:${port} as ${user}`);
    }
    return this.smtpTransporter;
  }
}
