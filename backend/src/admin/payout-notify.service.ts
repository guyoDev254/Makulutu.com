import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboundMailService } from '../mail/outbound-mail.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { extractKenyaMsisdn } from '../common/utils/mpesa-msisdn';

export type PayoutNotifyEvent =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID'
  | 'FAILED';

export type PayoutNotifyPayload = {
  amountKes: number;
  payoutChannel: string | null;
  payoutReference: string | null;
  notes: string | null;
  creator: {
    email: string;
    displayName: string | null;
    slug: string;
  };
};

export function buildPayoutNotifyCopy(
  event: PayoutNotifyEvent,
  payload: PayoutNotifyPayload,
  workspaceUrl: string,
) {
  const name = payload.creator.displayName?.trim() || 'Creator';
  const amount = `KES ${payload.amountKes.toFixed(2)}`;
  const channel = payload.payoutChannel?.trim() || 'the channel you submitted';
  const ref = payload.payoutReference?.trim();
  const notes = payload.notes?.trim();

  const subjects: Record<PayoutNotifyEvent, string> = {
    REQUESTED: `Payout sending — ${amount}`,
    APPROVED: `Payout queued — ${amount}`,
    REJECTED: `Payout request not approved — ${amount}`,
    PAID: `Payout sent — ${amount}`,
    FAILED: `Payout could not be sent — ${amount}`,
  };

  const bodies: Record<PayoutNotifyEvent, string> = {
    REQUESTED: `We received your payout request for ${amount} to ${channel}. Paystack is sending it to that M-Pesa number now. We will email you when it lands, or if it fails.`,
    APPROVED: `Your payout of ${amount} is queued with Paystack for transfer to ${channel}. We will notify you again once it is paid.`,
    REJECTED: `Your payout request for ${amount} was not approved.${notes ? ` Note from the team: ${notes}` : ''} You can submit a new request from your workspace if the balance is still available.`,
    PAID: `Your payout of ${amount} has been sent${ref ? ` (reference: ${ref})` : ''}. Destination: ${channel}.`,
    FAILED: `Your payout of ${amount} could not be sent to ${channel}.${notes ? ` ${notes}` : ''} The amount has been returned to your wallet so you can try again.`,
  };

  const text = `Hello ${name},\n\n${bodies[event]}\n\nWorkspace: ${workspaceUrl}\n`;
  const html = `<p>Hello ${escapeHtml(name)},</p>
<p>${escapeHtml(bodies[event])}</p>
<p><a href="${escapeHtml(workspaceUrl)}">Open your workspace</a></p>`;

  const whatsapp = `${subjects[event]}\n\n${bodies[event]}`;

  return {
    subject: subjects[event],
    text,
    html,
    whatsapp,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

@Injectable()
export class PayoutNotifyService {
  private readonly logger = new Logger(PayoutNotifyService.name);

  constructor(
    private readonly outboundMail: OutboundMailService,
    private readonly whatsapp: WhatsAppService,
    private readonly config: ConfigService,
  ) {}

  async notify(event: PayoutNotifyEvent, payload: PayoutNotifyPayload): Promise<void> {
    const workspaceUrl = this.creatorWorkspaceUrl();
    const copy = buildPayoutNotifyCopy(event, payload, workspaceUrl);
    const toName = payload.creator.displayName?.trim() || 'Creator';

    try {
      await this.outboundMail.sendTransactional({
        toEmail: payload.creator.email,
        toName,
        subject: copy.subject,
        text: copy.text,
        html: copy.html,
        devLog: {
          label: `payout ${event.toLowerCase()} email`,
          detail: `${payload.creator.email}: ${copy.subject}`,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Payout ${event} email failed for ${payload.creator.email}: ${message}`);
    }

    const msisdn = extractKenyaMsisdn(payload.payoutChannel);
    if (!msisdn) {
      this.logger.debug(
        `Payout ${event}: no Kenyan mobile in channel "${payload.payoutChannel || ''}" — skipping WhatsApp`,
      );
      return;
    }

    try {
      const sent = await this.whatsapp.sendMessage(msisdn, copy.whatsapp);
      if (!sent) {
        this.logger.warn(`Payout ${event} WhatsApp not sent to ${msisdn}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Payout ${event} WhatsApp failed for ${msisdn}: ${message}`);
    }
  }

  private creatorWorkspaceUrl(): string {
    const base =
      this.config.get<string>('FRONTEND_URL')?.trim() || 'http://localhost:3000';
    return `${base.replace(/\/$/, '')}/creator/workspace`;
  }
}
