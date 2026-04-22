import {
  CoachingBookingService,
  CoachingBookingStatus,
  PaymentPurpose,
  PaymentStatus,
  PrismaClient,
  SubscriptionStatus,
  PayoutRequestStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

/**
 * Idempotent tenant demo: each payment / payout / OBS row is keyed by stable references or labels.
 * Safe to re-run; adds missing rows only. Does not create extra creators.
 */
async function seedDetailedTenantDemo(
  baseCreator: { id: string; slug: string },
  adminUsername: string,
  demoRefPrefix: string,
): Promise<number> {
  let added = 0;
  const R = (suffix: string) => `${demoRefPrefix}${suffix}`;

  const hasPaymentRef = async (reference: string) =>
    !!(await prisma.payment.findFirst({
      where: { reference },
      select: { id: true },
    }));

  const hasPayout = async (ref: string, notesFallback?: string) => {
    const or: Array<{ payoutReference: string } | { notes: string }> = [
      { payoutReference: ref },
    ];
    if (notesFallback) or.push({ notes: notesFallback });
    return !!(await prisma.payoutRequest.findFirst({
      where: { creatorId: baseCreator.id, OR: or },
    }));
  };

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const mkDate = (daysAgo: number) => new Date(now.getTime() - daysAgo * dayMs);

  const mobileFor = (n: number) => `25470000${String(1000 + n).padStart(4, '0')}`;

  const creatorRow = await prisma.creator.findUnique({
    where: { id: baseCreator.id },
    select: { bio: true },
  });
  if (creatorRow && !(creatorRow.bio || '').trim()) {
    await prisma.creator.update({
      where: { id: baseCreator.id },
      data: {
        bio: 'Full-time eFootball streamer | Weekend ranked grind | Building a Kenyan FUMA community.',
        whatIDo:
          'Live ranked matches (PC), tactic breakdowns, squad builder reviews, and OBS-driven supporter shoutouts.',
        packagesSummary:
          'Subs: notes and replays. Shoutouts: on-stream + optional clip. Coaching: account review and rank-push bundles.',
        primaryCategory: 'eFootball / Sports games',
        socialLinks: JSON.stringify([
          { label: 'TikTok', url: 'https://www.tiktok.com/@makulutu' },
          { label: 'YouTube', url: 'https://www.youtube.com/@makulutu' },
        ]),
        supportEnabled: true,
      },
    });
    console.log(`✅ Creator "${baseCreator.slug}" enriched with demo profile copy`);
    added++;
  }

  type DemoUser = { name: string; tiktokUsername: string };
  const demoUsers: DemoUser[] = [
    { name: 'Amina Otieno', tiktokUsername: 'amina_otieno' },
    { name: 'Kevin Mwangi', tiktokUsername: 'kevin_mwangi' },
    { name: 'Faith Njeri', tiktokUsername: 'faith_njeri' },
    { name: 'Brian Kiptoo', tiktokUsername: 'brian_kiptoo' },
    { name: 'Zawadi Mutua', tiktokUsername: 'zawadi_mutua' },
    { name: 'Eric Omondi FC', tiktokUsername: 'eric_omondi_fc' },
    { name: 'Nyar Kisumu', tiktokUsername: 'nyar_kisumu' },
    { name: 'Jay Striker KE', tiktokUsername: 'jay_striker_ke' },
    { name: 'Mullah 442', tiktokUsername: 'mullah_442' },
    { name: 'Coach Wesley', tiktokUsername: 'coach_wesley_ke' },
    { name: 'Nairobi Nights Gaming', tiktokUsername: 'nairobi_nights_gaming' },
    { name: 'Pugu FC Fan', tiktokUsername: 'pugu_fc_fan' },
  ];

  const users: Array<{ id: string; tiktokUsername: string }> = [];
  for (let i = 0; i < demoUsers.length; i++) {
    const u = demoUsers[i];
    const phone = mobileFor(i + 1);
    const row = await prisma.user.upsert({
      where: { tiktokUsername: u.tiktokUsername },
      update: {
        name: u.name,
        mpesaMobile: phone,
        whatsappNumber: phone,
        creatorId: baseCreator.id,
        isActive: true,
        addedToWhatsApp: i % 3 === 0,
      },
      create: {
        name: u.name,
        tiktokUsername: u.tiktokUsername,
        mpesaMobile: phone,
        whatsappNumber: phone,
        creatorId: baseCreator.id,
        isActive: true,
        addedToWhatsApp: i % 3 === 0,
      },
      select: { id: true, tiktokUsername: true },
    });
    users.push(row);
  }

  const uid = (tiktokUsername: string) => {
    const row = users.find((x) => x.tiktokUsername === tiktokUsername);
    if (!row) throw new Error(`seed: missing user @${tiktokUsername}`);
    return row.id;
  };

  async function getOrCreateReward(name: string, data: {
    description: string | null;
    amountKes: number;
    alertBannerLabel: string;
    ttsScript: string | null;
    allowSupporterMessage: boolean;
    allowVideoClip: boolean;
    maxMessageLength: number;
    active: boolean;
    sortOrder: number;
    accentColor?: string | null;
  }) {
    const existing = await prisma.creatorReward.findFirst({
      where: { creatorId: baseCreator.id, name },
    });
    if (existing) return existing;
    const row = await prisma.creatorReward.create({
      data: {
        creatorId: baseCreator.id,
        name,
        ...data,
      },
    });
    added++;
    return row;
  }

  const rewardVip = await getOrCreateReward('VIP Goal Shout', {
    description: 'Custom shoutout + goal replay reaction on stream.',
    amountKes: 500,
    alertBannerLabel: 'VIP TIER!',
    ttsScript:
      'Huge respect to {{displayName}} for {{rewardName}}. {{message}}',
    allowSupporterMessage: true,
    allowVideoClip: true,
    maxMessageLength: 180,
    active: true,
    sortOrder: 0,
    accentColor: '#F59E0B',
  });

  const rewardHype = await getOrCreateReward('Hype Train', {
    description: 'Short, high-energy on-stream alert.',
    amountKes: 200,
    alertBannerLabel: 'HYPE!',
    ttsScript: '{{displayName}} just fuelled the hype train!',
    allowSupporterMessage: true,
    allowVideoClip: false,
    maxMessageLength: 120,
    active: true,
    sortOrder: 1,
    accentColor: '#22D3EE',
  });

  const rewardLab = await getOrCreateReward('Tactical Lab', {
    description: 'Offline squad + tactics review (patron-style tier).',
    amountKes: 1500,
    alertBannerLabel: 'LAB PATRON',
    ttsScript:
      'Shoutout to {{displayName}} for backing the Tactical Lab. Class act.',
    allowSupporterMessage: true,
    allowVideoClip: true,
    maxMessageLength: 280,
    active: true,
    sortOrder: 2,
    accentColor: '#A78BFA',
  });

  // --- Subscriptions (completed / pending / expired / cancelled) ---
  if (!(await hasPaymentRef(R('SUB_001')))) {
    const p = await prisma.payment.create({
      data: {
        userId: uid('amina_otieno'),
        creatorId: baseCreator.id,
        amount: 1200,
        months: 3,
        purpose: PaymentPurpose.SUBSCRIPTION,
        status: PaymentStatus.COMPLETED,
        reference: R('SUB_001'),
        completedAt: mkDate(7),
        subscriberAlertEmittedAt: mkDate(7),
        transactionId: 'DEMO-SUB-CHK-001',
        transactionReceipt: 'RFT-DEMO-SUB-001',
      },
    });
    await prisma.subscription.create({
      data: {
        userId: uid('amina_otieno'),
        creatorId: baseCreator.id,
        paymentId: p.id,
        months: 3,
        amount: 1200,
        startDate: mkDate(7),
        endDate: mkDate(-83),
        status: SubscriptionStatus.ACTIVE,
      },
    });
    added++;
  }

  if (!(await hasPaymentRef(R('SUB_002')))) {
    await prisma.payment.create({
      data: {
        userId: uid('faith_njeri'),
        creatorId: baseCreator.id,
        amount: 400,
        months: 1,
        purpose: PaymentPurpose.SUBSCRIPTION,
        status: PaymentStatus.PENDING,
        reference: R('SUB_002'),
        checkoutRequestId: 'ws_CO_demo_pending_sub',
      },
    });
    added++;
  }

  if (!(await hasPaymentRef(R('SUB_RENEW_001')))) {
    const p = await prisma.payment.create({
      data: {
        userId: uid('kevin_mwangi'),
        creatorId: baseCreator.id,
        amount: 350,
        months: 1,
        purpose: PaymentPurpose.SUBSCRIPTION,
        status: PaymentStatus.COMPLETED,
        reference: R('SUB_RENEW_001'),
        completedAt: mkDate(14),
        subscriberAlertEmittedAt: mkDate(14),
      },
    });
    await prisma.subscription.create({
      data: {
        userId: uid('kevin_mwangi'),
        creatorId: baseCreator.id,
        paymentId: p.id,
        months: 1,
        amount: 350,
        startDate: mkDate(14),
        endDate: mkDate(-17),
        status: SubscriptionStatus.ACTIVE,
      },
    });
    added++;
  }

  if (!(await hasPaymentRef(R('SUB_DECIMAL_001')))) {
    const p = await prisma.payment.create({
      data: {
        userId: uid('jay_striker_ke'),
        creatorId: baseCreator.id,
        amount: 199.99,
        months: 1,
        purpose: PaymentPurpose.SUBSCRIPTION,
        status: PaymentStatus.COMPLETED,
        reference: R('SUB_DECIMAL_001'),
        completedAt: mkDate(21),
        subscriberAlertEmittedAt: mkDate(21),
      },
    });
    await prisma.subscription.create({
      data: {
        userId: uid('jay_striker_ke'),
        creatorId: baseCreator.id,
        paymentId: p.id,
        months: 1,
        amount: 199.99,
        startDate: mkDate(21),
        endDate: mkDate(-9),
        status: SubscriptionStatus.ACTIVE,
      },
    });
    added++;
  }

  if (!(await hasPaymentRef(R('SUB_EXPIRED_001')))) {
    const p = await prisma.payment.create({
      data: {
        userId: uid('zawadi_mutua'),
        creatorId: baseCreator.id,
        amount: 500,
        months: 1,
        purpose: PaymentPurpose.SUBSCRIPTION,
        status: PaymentStatus.COMPLETED,
        reference: R('SUB_EXPIRED_001'),
        completedAt: mkDate(200),
        subscriberAlertEmittedAt: mkDate(200),
      },
    });
    await prisma.subscription.create({
      data: {
        userId: uid('zawadi_mutua'),
        creatorId: baseCreator.id,
        paymentId: p.id,
        months: 1,
        amount: 500,
        startDate: mkDate(200),
        endDate: mkDate(170),
        status: SubscriptionStatus.EXPIRED,
      },
    });
    added++;
  }

  if (!(await hasPaymentRef(R('SUB_CANCEL_001')))) {
    const p = await prisma.payment.create({
      data: {
        userId: uid('mullah_442'),
        creatorId: baseCreator.id,
        amount: 300,
        months: 1,
        purpose: PaymentPurpose.SUBSCRIPTION,
        status: PaymentStatus.COMPLETED,
        reference: R('SUB_CANCEL_001'),
        completedAt: mkDate(45),
        subscriberAlertEmittedAt: mkDate(45),
      },
    });
    await prisma.subscription.create({
      data: {
        userId: uid('mullah_442'),
        creatorId: baseCreator.id,
        paymentId: p.id,
        months: 1,
        amount: 300,
        startDate: mkDate(45),
        endDate: mkDate(-20),
        status: SubscriptionStatus.CANCELLED,
      },
    });
    added++;
  }

  // --- Shoutouts (TikTok / YouTube / Instagram; text + video) ---
  if (!(await hasPaymentRef(R('SHOUT_001')))) {
    const p = await prisma.payment.create({
      data: {
        userId: uid('kevin_mwangi'),
        creatorId: baseCreator.id,
        amount: 250,
        months: 1,
        purpose: PaymentPurpose.STREAM_ALERT,
        status: PaymentStatus.COMPLETED,
        reference: R('SHOUT_001'),
        completedAt: mkDate(4),
        subscriberAlertEmittedAt: mkDate(4),
      },
    });
    await prisma.streamShoutout.create({
      data: {
        paymentId: p.id,
        displayHandle: 'kevin_mwangi',
        platform: 'tiktok',
        message: 'Keep up the great streams — FUMA on point!',
        amountKes: 250,
      },
    });
    added++;
  }

  if (!(await hasPaymentRef(R('SHOUT_002')))) {
    await prisma.payment.create({
      data: {
        userId: uid('faith_njeri'),
        creatorId: baseCreator.id,
        amount: 120,
        months: 1,
        purpose: PaymentPurpose.STREAM_ALERT,
        status: PaymentStatus.FAILED,
        reference: R('SHOUT_002'),
        failedAt: mkDate(2),
        failureReason: 'User cancelled STK push',
      },
    });
    added++;
  }

  if (!(await hasPaymentRef(R('SHOUT_VIDEO_YT_001')))) {
    const p = await prisma.payment.create({
      data: {
        userId: uid('eric_omondi_fc'),
        creatorId: baseCreator.id,
        amount: 150,
        months: 1,
        purpose: PaymentPurpose.STREAM_ALERT,
        status: PaymentStatus.COMPLETED,
        reference: R('SHOUT_VIDEO_YT_001'),
        completedAt: mkDate(6),
        subscriberAlertEmittedAt: mkDate(6),
      },
    });
    await prisma.streamShoutout.create({
      data: {
        paymentId: p.id,
        displayHandle: 'EricPlaysDaily',
        platform: 'youtube',
        message: 'From YouTube — big up for the 4-2-3-1 tutorial!',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        amountKes: 150,
      },
    });
    added++;
  }

  if (!(await hasPaymentRef(R('SHOUT_IG_001')))) {
    const p = await prisma.payment.create({
      data: {
        userId: uid('nyar_kisumu'),
        creatorId: baseCreator.id,
        amount: 333.33,
        months: 1,
        purpose: PaymentPurpose.STREAM_ALERT,
        status: PaymentStatus.COMPLETED,
        reference: R('SHOUT_IG_001'),
        completedAt: mkDate(11),
        subscriberAlertEmittedAt: mkDate(11),
      },
    });
    await prisma.streamShoutout.create({
      data: {
        paymentId: p.id,
        displayHandle: 'nyar.kisumu.gaming',
        platform: 'instagram',
        message: 'Instagram fam says hi — decimal amount test for fees.',
        amountKes: 333.33,
      },
    });
    added++;
  }

  if (!(await hasPaymentRef(R('SHOUT_BIG_001')))) {
    const p = await prisma.payment.create({
      data: {
        userId: uid('nairobi_nights_gaming'),
        creatorId: baseCreator.id,
        amount: 5000,
        months: 1,
        purpose: PaymentPurpose.STREAM_ALERT,
        status: PaymentStatus.COMPLETED,
        reference: R('SHOUT_BIG_001'),
        completedAt: mkDate(9),
        subscriberAlertEmittedAt: mkDate(9),
      },
    });
    await prisma.streamShoutout.create({
      data: {
        paymentId: p.id,
        displayHandle: 'NairobiNights',
        platform: 'tiktok',
        message: 'Community raid — thanks for hosting!',
        amountKes: 5000,
      },
    });
    added++;
  }

  // --- Coaching (all services + statuses) ---
  if (!(await hasPaymentRef(R('COACH_001')))) {
    const p = await prisma.payment.create({
      data: {
        userId: uid('amina_otieno'),
        creatorId: baseCreator.id,
        amount: 100,
        months: 1,
        purpose: PaymentPurpose.COACHING_BOOKING,
        status: PaymentStatus.COMPLETED,
        reference: R('COACH_001'),
        completedAt: mkDate(3),
        subscriberAlertEmittedAt: mkDate(3),
      },
    });
    await prisma.coachingBooking.create({
      data: {
        service: CoachingBookingService.ACCOUNT_REVIEW,
        name: 'Amina Otieno',
        contact: mobileFor(1),
        accountUsername: 'AminaFC',
        availability: 'Weeknights after 8pm EAT',
        notes: 'Wants help defending through balls and wide overloads.',
        status: CoachingBookingStatus.SCHEDULED,
        adminNotes: 'Confirm Zoom link sent via WhatsApp.',
        paymentId: p.id,
      },
    });
    added++;
  }

  if (!(await hasPaymentRef(R('COACH_RANK_001')))) {
    const p = await prisma.payment.create({
      data: {
        userId: uid('coach_wesley_ke'),
        creatorId: baseCreator.id,
        amount: 250,
        months: 1,
        purpose: PaymentPurpose.COACHING_BOOKING,
        status: PaymentStatus.COMPLETED,
        reference: R('COACH_RANK_001'),
        completedAt: mkDate(18),
        subscriberAlertEmittedAt: mkDate(18),
      },
    });
    await prisma.coachingBooking.create({
      data: {
        service: CoachingBookingService.RANK_PUSH,
        name: 'Wesley K.',
        contact: mobileFor(10),
        accountUsername: 'WesRanked',
        availability: 'Sat–Sun mornings',
        notes: 'Stuck in Division 2 — needs pressing triggers.',
        status: CoachingBookingStatus.CONTACTED,
        paymentId: p.id,
      },
    });
    added++;
  }

  if (!(await hasPaymentRef(R('COACH_BOTH_001')))) {
    const p = await prisma.payment.create({
      data: {
        userId: uid('pugu_fc_fan'),
        creatorId: baseCreator.id,
        amount: 350,
        months: 1,
        purpose: PaymentPurpose.COACHING_BOOKING,
        status: PaymentStatus.COMPLETED,
        reference: R('COACH_BOTH_001'),
        completedAt: mkDate(25),
        subscriberAlertEmittedAt: mkDate(25),
      },
    });
    await prisma.coachingBooking.create({
      data: {
        service: CoachingBookingService.BOTH,
        name: 'Pugu FC Collective',
        contact: mobileFor(12),
        accountUsername: 'PUGU_ULTRA_09',
        availability: 'Flexible — WhatsApp first',
        notes: 'Bundle: account review then two-session rank push plan.',
        status: CoachingBookingStatus.COMPLETED,
        adminNotes: 'Completed 2025-03-10. Follow-up in 14 days.',
        paymentId: p.id,
      },
    });
    added++;
  }

  if (!(await hasPaymentRef(R('COACH_PENDING_001')))) {
    const p = await prisma.payment.create({
      data: {
        userId: uid('brian_kiptoo'),
        creatorId: baseCreator.id,
        amount: 100,
        months: 1,
        purpose: PaymentPurpose.COACHING_BOOKING,
        status: PaymentStatus.PENDING,
        reference: R('COACH_PENDING_001'),
        checkoutRequestId: 'ws_CO_demo_coach_pending',
      },
    });
    await prisma.coachingBooking.create({
      data: {
        service: CoachingBookingService.ACCOUNT_REVIEW,
        name: 'Brian Kiptoo',
        contact: mobileFor(4),
        accountUsername: 'BrianK_KE',
        availability: 'Evenings after 7pm EAT',
        notes: 'Awaiting M-Pesa — wants quick tactical tweak for 4-1-2-3.',
        status: CoachingBookingStatus.PENDING,
        paymentId: p.id,
      },
    });
    added++;
  }

  if (!(await hasPaymentRef(R('COACH_CANCEL_001')))) {
    const p = await prisma.payment.create({
      data: {
        userId: uid('jay_striker_ke'),
        creatorId: baseCreator.id,
        amount: 100,
        months: 1,
        purpose: PaymentPurpose.COACHING_BOOKING,
        status: PaymentStatus.COMPLETED,
        reference: R('COACH_CANCEL_001'),
        completedAt: mkDate(40),
        subscriberAlertEmittedAt: mkDate(40),
      },
    });
    await prisma.coachingBooking.create({
      data: {
        service: CoachingBookingService.ACCOUNT_REVIEW,
        name: 'Jay Striker',
        contact: mobileFor(8),
        accountUsername: 'JayST',
        availability: '—',
        notes: 'Refunded after double booking; keep row for audit.',
        status: CoachingBookingStatus.CANCELLED,
        adminNotes: 'Duplicate checkout — user refunded M-Pesa.',
        paymentId: p.id,
      },
    });
    added++;
  }

  // --- Creator reward purchases ---
  if (!(await hasPaymentRef(R('REWARD_001')))) {
    const p = await prisma.payment.create({
      data: {
        userId: uid('faith_njeri'),
        creatorId: baseCreator.id,
        amount: 500,
        months: 1,
        purpose: PaymentPurpose.CREATOR_REWARD,
        status: PaymentStatus.COMPLETED,
        reference: R('REWARD_001'),
        completedAt: mkDate(1),
        subscriberAlertEmittedAt: mkDate(1),
      },
    });
    await prisma.creatorRewardPurchase.create({
      data: {
        paymentId: p.id,
        rewardId: rewardVip.id,
        rewardNameSnapshot: rewardVip.name,
        bannerLabelSnapshot: rewardVip.alertBannerLabel,
        ttsScriptSnapshot: rewardVip.ttsScript,
        displayName: 'faith_njeri',
        platform: 'tiktok',
        supporterMessage: 'You inspired my gameplay this week — asante!',
      },
    });
    added++;
  }

  if (!(await hasPaymentRef(R('REWARD_HYPE_001')))) {
    const p = await prisma.payment.create({
      data: {
        userId: uid('brian_kiptoo'),
        creatorId: baseCreator.id,
        amount: 200,
        months: 1,
        purpose: PaymentPurpose.CREATOR_REWARD,
        status: PaymentStatus.COMPLETED,
        reference: R('REWARD_HYPE_001'),
        completedAt: mkDate(5),
        subscriberAlertEmittedAt: mkDate(5),
      },
    });
    await prisma.creatorRewardPurchase.create({
      data: {
        paymentId: p.id,
        rewardId: rewardHype.id,
        rewardNameSnapshot: rewardHype.name,
        bannerLabelSnapshot: rewardHype.alertBannerLabel,
        ttsScriptSnapshot: rewardHype.ttsScript,
        displayName: 'brian_kiptoo',
        platform: 'tiktok',
        supporterMessage: 'GGs only',
      },
    });
    added++;
  }

  if (!(await hasPaymentRef(R('REWARD_LAB_CLIP_001')))) {
    const p = await prisma.payment.create({
      data: {
        userId: uid('nairobi_nights_gaming'),
        creatorId: baseCreator.id,
        amount: 1500,
        months: 1,
        purpose: PaymentPurpose.CREATOR_REWARD,
        status: PaymentStatus.COMPLETED,
        reference: R('REWARD_LAB_CLIP_001'),
        completedAt: mkDate(8),
        subscriberAlertEmittedAt: mkDate(8),
      },
    });
    await prisma.creatorRewardPurchase.create({
      data: {
        paymentId: p.id,
        rewardId: rewardLab.id,
        rewardNameSnapshot: rewardLab.name,
        bannerLabelSnapshot: rewardLab.alertBannerLabel,
        ttsScriptSnapshot: rewardLab.ttsScript,
        displayName: 'NairobiNights',
        platform: 'tiktok',
        supporterMessage: 'Here is a clip from last week’s comeback win.',
        videoUrl: 'https://www.tiktok.com/@nairobi_nights_gaming/video/7123456789012345678',
      },
    });
    added++;
  }

  // --- Payout requests ---
  if (!(await hasPayout(R('PAYOUT_PEND_W1'), 'Weekly payout request from demo seed'))) {
    await prisma.payoutRequest.create({
      data: {
        creatorId: baseCreator.id,
        amountKes: 800,
        status: PayoutRequestStatus.PENDING,
        payoutChannel: 'M-Pesa 254700000999',
        notes: 'Weekly payout request from demo seed',
        payoutReference: R('PAYOUT_PEND_W1'),
      },
    });
    added++;
  }

  if (!(await hasPayout(R('PAYOUT_TXN_001'), 'Paid demo payout'))) {
    await prisma.payoutRequest.create({
      data: {
        creatorId: baseCreator.id,
        amountKes: 350,
        status: PayoutRequestStatus.PAID,
        payoutChannel: 'M-Pesa 254700000999',
        payoutReference: R('PAYOUT_TXN_001'),
        notes: 'Paid demo payout',
        reviewedBy: adminUsername,
        reviewedAt: mkDate(6),
        paidAt: mkDate(5),
      },
    });
    added++;
  }

  if (!(await hasPayout(R('PAYOUT_APPR_001')))) {
    await prisma.payoutRequest.create({
      data: {
        creatorId: baseCreator.id,
        amountKes: 1200,
        status: PayoutRequestStatus.APPROVED,
        payoutChannel: 'M-Pesa 254711223344',
        payoutReference: R('PAYOUT_APPR_001'),
        notes: 'Approved — awaiting finance batch Friday.',
        reviewedBy: adminUsername,
        reviewedAt: mkDate(3),
      },
    });
    added++;
  }

  if (!(await hasPayout(R('PAYOUT_REJ_001')))) {
    await prisma.payoutRequest.create({
      data: {
        creatorId: baseCreator.id,
        amountKes: 50,
        status: PayoutRequestStatus.REJECTED,
        payoutChannel: 'Wrong till number submitted',
        payoutReference: R('PAYOUT_REJ_001'),
        notes: 'Rejected seed: invalid paybill; user to resubmit.',
        reviewedBy: adminUsername,
        reviewedAt: mkDate(12),
      },
    });
    added++;
  }

  // --- OBS browser source links (active + revoked) ---
  const obsLabelActive = `${demoRefPrefix}OBS primary overlay`;
  const obsActiveExists = await prisma.obsStreamLink.findFirst({
    where: { creatorId: baseCreator.id, label: obsLabelActive },
  });
  if (!obsActiveExists) {
    await prisma.obsStreamLink.create({
      data: {
        creatorId: baseCreator.id,
        label: obsLabelActive,
        token: randomBytes(32).toString('base64url'),
      },
    });
    added++;
  }

  const obsLabelRev = `${demoRefPrefix}OBS old laptop (revoked)`;
  const obsRevExists = await prisma.obsStreamLink.findFirst({
    where: { creatorId: baseCreator.id, label: obsLabelRev },
  });
  if (!obsRevExists) {
    await prisma.obsStreamLink.create({
      data: {
        creatorId: baseCreator.id,
        label: obsLabelRev,
        token: randomBytes(32).toString('base64url'),
        revokedAt: mkDate(60),
      },
    });
    added++;
  }

  if (added > 0) {
    console.log(
      `✅ Demo tenant data synced for "${baseCreator.slug}" (${added} new seed action(s); payments are idempotent by reference)`,
    );
  } else {
    console.log(`⏭️  Demo tenant data already complete for "${baseCreator.slug}"`);
  }

  return added;
}

async function main() {
  console.log('🌱 Seeding database...');

  // Platform operator (not a creator). Override with ADMIN_USERNAME in .env.
  const adminUsername = process.env.ADMIN_USERNAME || 'makulutu';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'CillianMurphy!@#';
  /** Legacy seeded name — rename in-place so ids/passwords are preserved */
  const legacySuperAdminUsername =
    process.env.ADMIN_LEGACY_USERNAME || 'admin';

  let created = 0;

  // Idempotent: legacy super admin row -> current ADMIN_USERNAME
  const targetTaken = await prisma.admin.findUnique({
    where: { username: adminUsername },
  });
  if (!targetTaken && legacySuperAdminUsername !== adminUsername) {
    const legacy = await prisma.admin.findUnique({
      where: { username: legacySuperAdminUsername },
    });
    if (legacy?.role === 'SUPER_ADMIN') {
      await prisma.admin.update({
        where: { id: legacy.id },
        data: { username: adminUsername },
      });
      console.log(
        `✅ Super admin username renamed: "${legacySuperAdminUsername}" → "${adminUsername}" (id & password unchanged)`,
      );
      created++;
    }
  }

  const existingAdmin = await prisma.admin.findFirst({
    where: {
      OR: [
        { username: adminUsername },
        { email: adminEmail.toLowerCase() },
      ],
    },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await prisma.admin.create({
      data: {
        username: adminUsername,
        email: adminEmail.toLowerCase(),
        password: hashedPassword,
        role: 'SUPER_ADMIN',
      },
    });
    console.log('✅ Super Admin created');
    console.log(`   Username: ${adminUsername} / Password: ${adminPassword}`);
    created++;
  } else if (
    existingAdmin.username !== adminUsername ||
    (existingAdmin.email || '').toLowerCase() !== adminEmail.toLowerCase() ||
    existingAdmin.role !== 'SUPER_ADMIN'
  ) {
    await prisma.admin.update({
      where: { id: existingAdmin.id },
      data: {
        username: adminUsername,
        email: adminEmail.toLowerCase(),
        role: 'SUPER_ADMIN',
      },
    });
    console.log('✅ Super Admin aligned by existing username/email');
    created++;
  } else {
    console.log('⏭️  Super Admin already exists');
  }

  // No creator seeding here by request.
  // We only seed non-creator entities; creator-dependent sample rows are optional
  // and use an existing creator if present.

  // Moderator user (MODERATOR role – can view + WhatsApp confirm/remove only)
  const modUsername = process.env.MODERATOR_USERNAME || 'moderator';
  const modEmail = process.env.MODERATOR_EMAIL || 'moderator@example.com';
  const modPassword = process.env.MODERATOR_PASSWORD || 'moderator!@#';

  const existingMod = await prisma.admin.findFirst({
    where: {
      OR: [
        { username: modUsername },
        { email: modEmail.toLowerCase() },
      ],
    },
  });

  if (!existingMod) {
    const hashedModPassword = await bcrypt.hash(modPassword, 10);
    await prisma.admin.create({
      data: {
        username: modUsername,
        email: modEmail.toLowerCase(),
        password: hashedModPassword,
        role: 'MODERATOR',
      },
    });
    console.log('✅ Moderator created');
    console.log(`   Username: ${modUsername} / Password: ${modPassword}`);
    created++;
  } else if (
    existingMod.username !== modUsername ||
    (existingMod.email || '').toLowerCase() !== modEmail.toLowerCase() ||
    existingMod.role !== 'MODERATOR'
  ) {
    await prisma.admin.update({
      where: { id: existingMod.id },
      data: {
        username: modUsername,
        email: modEmail.toLowerCase(),
        role: 'MODERATOR',
      },
    });
    console.log('✅ Moderator aligned by existing username/email');
    created++;
  } else {
    console.log('⏭️  Moderator already exists');
  }

  // Link super admin → public creator /makulutu (override slug with PLATFORM_CREATOR_SLUG).
  const superAdmin = await prisma.admin.findFirst({
    where: { role: 'SUPER_ADMIN', isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  if (superAdmin?.password) {
    const slug = (process.env.PLATFORM_CREATOR_SLUG || 'makulutu').trim().toLowerCase();
    const displayName =
      superAdmin.username && superAdmin.username.trim().length > 0
        ? superAdmin.username.trim()
        : 'Makulutu';
    const adminEmail = (superAdmin.email || '').trim().toLowerCase();

    const bySlug = await prisma.creator.findUnique({
      where: { slug },
      select: { id: true, email: true, displayName: true },
    });

    if (bySlug) {
      const emailTakenByOther =
        adminEmail &&
        (await prisma.creator.findFirst({
          where: {
            email: adminEmail,
            id: { not: bySlug.id },
          },
          select: { id: true },
        }));

      await prisma.creator.update({
        where: { id: bySlug.id },
        data: {
          password: superAdmin.password,
          displayName: (bySlug.displayName || '').trim() || displayName,
          onboardingComplete: true,
          ...(adminEmail && !emailTakenByOther ? { email: adminEmail } : {}),
        },
      });
      console.log(`✅ Creator /${slug} synced with super admin credentials`);
    } else {
      let email = adminEmail || 'makulutu@creator.local';
      const emailBusy = await prisma.creator.findUnique({
        where: { email },
        select: { id: true },
      });
      if (emailBusy) {
        email = `makulutu-${Date.now()}@creator.local`;
      }
      await prisma.creator.create({
        data: {
          email,
          password: superAdmin.password,
          slug,
          displayName,
          onboardingComplete: true,
        },
      });
      console.log(`✅ Creator /${slug} created from super admin`);
    }
  } else {
    console.log('⏭️  Platform creator sync skipped (no super admin password)');
  }

  // Default monthly price (settings)
  const existingPrice = await prisma.settings.findUnique({
    where: { key: 'default_monthly_price' },
  });
  if (!existingPrice) {
    await prisma.settings.upsert({
      where: { key: 'default_monthly_price' },
      update: {},
      create: { key: 'default_monthly_price', value: '1' },
    });
    console.log('✅ Default monthly price set to 1 KES');
    created++;
  }

  const shoutoutDefaults: Array<{ key: string; value: string }> = [
    { key: 'shoutout_min_kes', value: '10' },
    { key: 'shoutout_min_kes_with_video', value: '50' },
    { key: 'shoutout_max_kes', value: '500000' },
  ];
  for (const row of shoutoutDefaults) {
    const exists = await prisma.settings.findUnique({ where: { key: row.key } });
    if (!exists) {
      await prisma.settings.create({ data: { key: row.key, value: row.value } });
      console.log(`✅ Shoutout setting ${row.key} = ${row.value}`);
      created++;
    }
  }

  const coachingPriceKey = 'coaching_account_review_kes';
  const coachingPriceExists = await prisma.settings.findUnique({
    where: { key: coachingPriceKey },
  });
  if (!coachingPriceExists) {
    await prisma.settings.create({
      data: { key: coachingPriceKey, value: '100' },
    });
    console.log(`✅ Coaching account review checkout = 100 KES (${coachingPriceKey})`);
    created++;
  }

  const obsTimerDefaults: Array<{ key: string; value: string }> = [
    { key: 'obs_alert_secs_new', value: '12' },
    { key: 'obs_alert_secs_renewal', value: '12' },
    { key: 'obs_alert_secs_shoutout', value: '12' },
    { key: 'obs_alert_secs_shoutout_video', value: '45' },
  ];
  for (const row of obsTimerDefaults) {
    const exists = await prisma.settings.findUnique({ where: { key: row.key } });
    if (!exists) {
      await prisma.settings.create({ data: { key: row.key, value: row.value } });
      console.log(`✅ OBS alert timer ${row.key} = ${row.value}s`);
      created++;
    }
  }

  const platformFeeKey = 'platform_fee_percent';
  if (!(await prisma.settings.findUnique({ where: { key: platformFeeKey } }))) {
    await prisma.settings.create({
      data: { key: platformFeeKey, value: '10' },
    });
    console.log('✅ Default platform_fee_percent = 10 (per-payment fee in admin / creator wallet)');
    created++;
  }

  // Demo operational data (users / payments / subs / shoutouts / coaching / rewards / payouts / OBS).
  // Idempotent per reference — safe to re-run; adds missing rows only. No extra creators.
  const demoRefPrefix = 'SEED_DEMO_';
  const baseCreator = await prisma.creator.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, slug: true },
  });

  if (!baseCreator) {
    console.log('⏭️  Demo data skipped (no active creator to own tenant-scoped rows)');
  } else {
    const demoAdds = await seedDetailedTenantDemo(
      baseCreator,
      adminUsername,
      demoRefPrefix,
    );
    created += demoAdds;
  }

  if (created === 0) {
    console.log('✅ Seed complete (nothing new to create)');
  } else {
    console.log(`✅ Seed complete (${created} item(s) created)`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
