import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { AdminRole, PayoutRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { OutboundMailService } from '../mail/outbound-mail.service';
import { FanNotifyService } from '../fan-portal/fan-notify.service';
import { FinanceService } from '../finance/finance.service';
import {
  PAYOUT_REMINDER_HOUR,
  PAYOUT_REMINDER_WEEKDAY,
} from '../common/utils/payout-weekly-schedule';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly prisma: PrismaService,
    private readonly outboundMail: OutboundMailService,
    private readonly config: ConfigService,
    private readonly fanNotify: FanNotifyService,
    private readonly finance: FinanceService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async settleCreatorEarnings() {
    try {
      const n = await this.finance.settleDuePayments();
      if (n > 0) {
        this.logger.log(`Settled ${n} creator earning(s)`);
      }
    } catch (e) {
      this.logger.error(
        `Settlement worker failed: ${e instanceof Error ? e.message : e}`,
      );
    }
  }

  /**
   * Check and expire subscriptions daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredSubscriptions() {
    this.logger.log('Checking for expired subscriptions...');
    await this.subscriptionService.checkAndExpireSubscriptions();
    await this.fanNotify.membershipExpiringSoon();
    this.logger.log('Expired subscriptions check completed');
  }

  /**
   * Weekly reminder (Wednesdays 09:00 server time — set `TZ` in production).
   * Notifies super admins to process pending creator payouts in Admin → Payouts.
   */
  @Cron(`0 ${PAYOUT_REMINDER_HOUR} * * ${PAYOUT_REMINDER_WEEKDAY}`)
  async weeklySuperAdminPayoutReminder() {
    if (this.config.get<string>('PAYOUT_REMINDER_ENABLED')?.trim() === 'false') {
      this.logger.log('Payout reminder cron skipped (PAYOUT_REMINDER_ENABLED=false)');
      return;
    }

    const pending = await this.prisma.payoutRequest.findMany({
      where: { status: PayoutRequestStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      include: {
        creator: {
          select: { slug: true, displayName: true, email: true },
        },
      },
    });

    const superAdmins = await this.prisma.admin.findMany({
      where: { role: AdminRole.SUPER_ADMIN, isActive: true },
      select: { email: true },
    });
    const fromDb = superAdmins
      .map((a) => a.email?.trim().toLowerCase())
      .filter((e): e is string => Boolean(e));

    const extra = (this.config.get<string>('PAYOUT_REMINDER_EMAILS') || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const recipients = [...new Set([...fromDb, ...extra])];

    const count = pending.length;
    const baseUrl =
      this.config.get<string>('FRONTEND_URL')?.trim() || 'http://localhost:3000';
    const adminPath = '/admin';
    const lines = pending.map((p) => {
      const amt = Number(p.amountKes);
      const who = p.creator?.displayName || p.creator?.slug || p.creatorId;
      return `- ${who} (${p.creator?.slug || '—'}): KES ${amt.toFixed(2)} · ${p.payoutChannel || 'channel TBD'} · requested ${p.createdAt.toISOString().slice(0, 10)}`;
    });

    const text =
      count === 0
        ? `Wednesday payout reminder: there are no pending creator payout requests right now.\n\nWhen requests arrive, review them in the admin dashboard → Payouts tab, then complete bank/M-Pesa transfers and mark each as paid.\n\nOpen dashboard: ${baseUrl}${adminPath}\n`
        : `Wednesday payout reminder: ${count} pending creator payout request(s). Please review in Admin → Payouts, export the approved M-Pesa CSV batch, send funds, then mark items as paid.\n\n${lines.join('\n')}\n\nDashboard: ${baseUrl}${adminPath}\n`;

    const rows =
      count === 0
        ? '<p><strong>No pending payout requests</strong> this week.</p>'
        : `<table style="border-collapse:collapse;width:100%;max-width:640px;"><thead><tr>
<th style="text-align:left;border:1px solid #ccc;padding:8px;">Creator</th>
<th style="text-align:left;border:1px solid #ccc;padding:8px;">KES</th>
<th style="text-align:left;border:1px solid #ccc;padding:8px;">Channel</th>
<th style="text-align:left;border:1px solid #ccc;padding:8px;">Requested</th>
</tr></thead><tbody>` +
          pending
            .map((p) => {
              const amt = Number(p.amountKes);
              const who =
                `${p.creator?.displayName || ''} (${p.creator?.slug || '—'})`.trim();
              return `<tr>
<td style="border:1px solid #ccc;padding:8px;">${who}</td>
<td style="border:1px solid #ccc;padding:8px;">${amt.toFixed(2)}</td>
<td style="border:1px solid #ccc;padding:8px;">${p.payoutChannel || '—'}</td>
<td style="border:1px solid #ccc;padding:8px;">${p.createdAt.toISOString().slice(0, 10)}</td>
</tr>`;
            })
            .join('') +
          '</tbody></table>';

    const html = `<p>Weekly payout day — super admin checklist:</p>
<ol>
<li>Open <a href="${baseUrl}${adminPath}">admin dashboard</a> → <strong>Payouts</strong>.</li>
<li>Approve or reject new requests as needed.</li>
<li>Click <strong>Export approved batch</strong> to download the M-Pesa CSV (phone, amount, payee).</li>
<li>Send the transfers, then mark each row as <strong>Paid</strong> with the payout reference. Creators are notified by email/WhatsApp automatically.</li>
</ol>
${rows}
<p style="margin-top:16px;color:#666;font-size:13px;">This is an automated reminder (Wednesdays). Adjust schedule in code/env if needed.</p>`;

    this.logger.log(
      `Weekly payout reminder: ${count} pending, ${recipients.length} recipient(s)`,
    );

    if (recipients.length === 0) {
      this.logger.warn(
        'No super admin emails and PAYOUT_REMINDER_EMAILS empty — payout reminder not sent. Add SUPER_ADMIN emails in DB or set PAYOUT_REMINDER_EMAILS.',
      );
      return;
    }

    const subject =
      count === 0
        ? 'Weekly payout reminder — no pending requests'
        : `Weekly payout reminder — ${count} pending request(s)`;

    for (const toEmail of recipients) {
      try {
        await this.outboundMail.sendTransactional({
          toEmail,
          subject,
          text,
          html,
          devLog: {
            label: 'weekly payout reminder',
            detail: `${toEmail}: ${count} pending (see logs)`,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Payout reminder email failed for ${toEmail}: ${message}`);
      }
    }
  }
}
