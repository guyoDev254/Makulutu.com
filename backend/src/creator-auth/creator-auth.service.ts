import {
  BadRequestException,
  Logger,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Creator, Prisma } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { OutboundMailService } from '../mail/outbound-mail.service';
import { GoogleTokenService } from '../common/google-auth/google-token.service';
import { ScheduledLivesService } from '../scheduled-lives/scheduled-lives.service';
import {
  creatorMediaColumn,
  isCreatorMediaSlot,
  MediaStorageService,
} from '../common/media/media-storage.service';
import {
  EMAIL_OTP_RESEND_MS,
  EMAIL_OTP_TTL_MS,
  emailOtpMail,
  hashEmailOtp,
  newEmailOtp,
} from '../common/utils/email-otp';
import {
  hasRequiredStreamingChannel,
  parseSocialLinksJson,
  streamingChannelFingerprint,
  streamVerificationStatus,
} from '../common/utils/streaming-channel-urls';
import { LoginCreatorDto } from './dto/login-creator.dto';
import { SignupCreatorDto } from './dto/signup-creator.dto';
import { UpdateCreatorProfileDto } from './dto/update-creator-profile.dto';
import {
  DateOfBirthError,
  parseAdultDateOfBirth,
} from '../common/utils/date-of-birth';
import { extractStoredS3Key } from '../storage/storage.service';
import {
  findAdminByLoginIdentifier,
  promoteSeededAdminUsernameIfAlias,
} from '../common/utils/admin-login-lookup';

@Injectable()
export class CreatorAuthService {
  private readonly logger = new Logger(CreatorAuthService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly outboundMail: OutboundMailService,
    private readonly google: GoogleTokenService,
    private readonly scheduledLives: ScheduledLivesService,
    private readonly media: MediaStorageService,
  ) {}

  private requireAdultDob(raw?: string | null) {
    try {
      return parseAdultDateOfBirth(raw);
    } catch (err) {
      throw new BadRequestException(
        err instanceof DateOfBirthError ? err.message : 'You must be 18 or older to register.',
      );
    }
  }

  async signup(dto: SignupCreatorDto) {
    const email = dto.email.trim().toLowerCase();
    const slug = dto.slug.trim().toLowerCase();
    const existing = await this.prisma.creator.findFirst({
      where: { OR: [{ email }, { slug }] },
    });
    if (existing) {
      const emailMatch =
        existing.email.trim().toLowerCase() === email;
      const slugMatch = existing.slug.trim().toLowerCase() === slug;
      if (emailMatch && !existing.emailVerifiedAt) {
        return this.retryUnverifiedSignup(existing, dto);
      }
      if (emailMatch) {
        throw new BadRequestException('Email is already registered. Sign in instead.');
      }
      if (slugMatch) {
        throw new BadRequestException('Slug is already taken. Choose another public page name.');
      }
      throw new BadRequestException('Email is already registered');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const code = newEmailOtp();
    const created = await this.prisma.creator.create({
      data: {
        email,
        password: hashed,
        slug,
        displayName: dto.displayName.trim(),
        bio: dto.bio?.trim() || null,
        whatIDo: dto.whatIDo?.trim() || null,
        packagesSummary: dto.packagesSummary?.trim() || null,
        dateOfBirth: this.requireAdultDob(dto.dateOfBirth),
        emailVerificationTokenHash: hashEmailOtp(email, code),
        emailVerificationExpiresAt: new Date(Date.now() + EMAIL_OTP_TTL_MS),
      },
    });
    return this.finishSignup(created.email, code, created.displayName);
  }

  private async retryUnverifiedSignup(existing: Creator, dto: SignupCreatorDto) {
    const hashed = await bcrypt.hash(dto.password, 10);
    const code = newEmailOtp();
    const displayName = dto.displayName.trim() || existing.displayName;
    this.assertEmailOtpResendAllowed(existing.emailVerificationExpiresAt);
    await this.prisma.creator.update({
      where: { id: existing.id },
      data: {
        password: hashed,
        displayName,
        dateOfBirth: this.requireAdultDob(dto.dateOfBirth),
        emailVerificationTokenHash: hashEmailOtp(existing.email, code),
        emailVerificationExpiresAt: new Date(Date.now() + EMAIL_OTP_TTL_MS),
      },
    });
    return this.finishSignup(existing.email, code, displayName);
  }

  private async finishSignup(email: string, code: string, displayName: string) {
    this.queueVerificationEmail(email, code, displayName);
    return {
      ok: true,
      requiresEmailVerification: true,
      email,
      message:
        'Account created. Enter the 6-digit code we sent to your email, then sign in.',
      ...this.devOtpPayload(code),
    };
  }

  private queueVerificationEmail(
    toEmail: string,
    code: string,
    displayName: string,
  ): void {
    void this.trySendVerificationEmail(toEmail, code, displayName);
  }

  private async trySendVerificationEmail(
    toEmail: string,
    code: string,
    displayName: string,
  ): Promise<boolean> {
    try {
      await this.sendVerificationEmail(toEmail, code, displayName);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Verification email failed for ${toEmail}: ${message}.` +
          (this.isDev() ? ` Dev code: ${code}` : ''),
      );
      return false;
    }
  }

  async login(dto: LoginCreatorDto) {
    const identifier = dto.identifier.trim();
    if (!identifier) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const identifierLower = identifier.toLowerCase();

    let creator = await this.findCreatorByIdentifier(identifierLower);

    if (creator) {
      if (!creator.password) {
        throw new UnauthorizedException(
          'This account uses Google sign-in. Continue with Google, or set a password from the website.',
        );
      }
      const creatorPwOk = await bcrypt.compare(dto.password, creator.password);
      if (!creatorPwOk) {
        let admin = await findAdminByLoginIdentifier(this.prisma, identifier);
        if (
          admin?.password &&
          admin.isActive &&
          (await bcrypt.compare(dto.password, admin.password))
        ) {
          admin = await promoteSeededAdminUsernameIfAlias(
            this.prisma,
            admin,
            identifier,
          );
          creator = await this.prisma.creator.update({
            where: { id: creator.id },
            data: { password: admin.password },
          });
        } else {
          throw new UnauthorizedException('Invalid credentials');
        }
      }
    } else {
      let admin = await findAdminByLoginIdentifier(this.prisma, identifier);
      if (!admin || !admin.password) {
        throw new UnauthorizedException('Invalid credentials');
      }
      const adminOk = await bcrypt.compare(dto.password, admin.password);
      if (!adminOk) throw new UnauthorizedException('Invalid credentials');
      if (!admin.isActive) {
        throw new UnauthorizedException('Admin account is inactive');
      }

      admin = await promoteSeededAdminUsernameIfAlias(
        this.prisma,
        admin,
        identifier,
      );

      creator = await this.ensureCreatorForPlatformOperator(admin);
    }

    if (!creator.isActive) {
      throw new UnauthorizedException('Creator account is inactive');
    }
    if (!creator.emailVerifiedAt) {
      throw new UnauthorizedException(
        'Please verify your email first. Enter the 6-digit code we sent, or request a new one.',
      );
    }
    await this.prisma.creator.update({
      where: { id: creator.id },
      data: { lastLogin: new Date() },
    });
    return this.issueToken(creator);
  }

  async loginWithGoogle(idToken: string, dateOfBirthRaw?: string) {
    const profile = await this.google.verifyIdToken(idToken);
    const byGoogle = await this.prisma.creator.findUnique({
      where: { googleId: profile.googleId },
    });
    const byEmail = await this.prisma.creator.findFirst({
      where: { email: { equals: profile.email, mode: 'insensitive' } },
    });
    let creator = byGoogle || byEmail;
    if (creator && byGoogle && byEmail && byGoogle.id !== byEmail.id) {
      throw new BadRequestException('This Google account cannot be linked');
    }
    if (creator && creator.googleId && creator.googleId !== profile.googleId) {
      throw new BadRequestException('Email is already registered');
    }
    if (!creator) {
      const slug = await this.reserveUniqueSlug(
        this.toSlug(profile.email.split('@')[0] || 'creator'),
      );
      const displayName = (profile.name || slug).slice(0, 80);
      creator = await this.prisma.creator.create({
        data: {
          email: profile.email,
          googleId: profile.googleId,
          slug,
          displayName,
          dateOfBirth: this.requireAdultDob(dateOfBirthRaw),
          password: null,
          avatarUrl: profile.picture,
          emailVerifiedAt: new Date(),
          lastLogin: new Date(),
          onboardingComplete: false,
        },
      });
      return this.issueToken(creator);
    }
    if (!creator.isActive) {
      throw new UnauthorizedException('Creator account is inactive');
    }
    creator = await this.prisma.creator.update({
      where: { id: creator.id },
      data: {
        googleId: creator.googleId || profile.googleId,
        emailVerifiedAt: creator.emailVerifiedAt ?? new Date(),
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
        lastLogin: new Date(),
        ...(!creator.avatarUrl && profile.picture
          ? { avatarUrl: profile.picture }
          : {}),
      },
    });
    return this.issueToken(creator);
  }

  /** Email and slug compared case-insensitively (Postgres). */
  private findCreatorByIdentifier(identifierLower: string) {
    return this.prisma.creator.findFirst({
      where: {
        OR: [
          { email: { equals: identifierLower, mode: 'insensitive' } },
          { slug: { equals: identifierLower, mode: 'insensitive' } },
        ],
      },
    });
  }

  async validateCreatorById(id: string): Promise<Creator | null> {
    return this.prisma.creator.findUnique({ where: { id } });
  }

  async me(creatorId: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { id: creatorId },
    });
    if (!creator) throw new UnauthorizedException('Creator not found');
    if (creator.thumbnailUrl || creator.coverUrl) {
      await this.deleteStoredExtras(creator);
      const cleaned = await this.prisma.creator.update({
        where: { id: creatorId },
        data: { thumbnailUrl: null, coverUrl: null },
      });
      return this.serializeCreator(cleaned);
    }
    return this.serializeCreator(creator);
  }

  async updateProfile(creatorId: string, dto: UpdateCreatorProfileDto) {
    const existingCreator = await this.prisma.creator.findUnique({
      where: { id: creatorId },
    });
    if (!existingCreator) throw new UnauthorizedException('Creator not found');

    const hasSlug =
      dto.slug !== undefined &&
      dto.slug !== null &&
      String(dto.slug).trim().length > 0;
    if (hasSlug) {
      const slug = String(dto.slug).trim().toLowerCase();
      const taken = await this.prisma.creator.findFirst({
        where: { slug, id: { not: creatorId } },
        select: { id: true },
      });
      if (taken) throw new BadRequestException('Slug is already taken');
    }

    const data: Prisma.CreatorUpdateInput = {};

    if (dto.displayName !== undefined && dto.displayName !== null) {
      data.displayName = String(dto.displayName).trim();
    }
    if (dto.bio !== undefined) {
      data.bio =
        dto.bio === null || dto.bio === ''
          ? null
          : String(dto.bio).trim() || null;
    }
    if (dto.whatIDo !== undefined) {
      data.whatIDo =
        dto.whatIDo === null || dto.whatIDo === ''
          ? null
          : String(dto.whatIDo).trim() || null;
    }
    if (dto.packagesSummary !== undefined) {
      data.packagesSummary =
        dto.packagesSummary === null || dto.packagesSummary === ''
          ? null
          : String(dto.packagesSummary).trim() || null;
    }
    if (dto.avatarUrl !== undefined) {
      const raw =
        dto.avatarUrl === null || dto.avatarUrl === ''
          ? ''
          : String(dto.avatarUrl).trim();
      if (raw) {
        const key = this.storageKeyFromAvatarInput(raw);
        if (key) {
          data.avatarUrl = key;
        } else if (
          /^https:\/\//i.test(raw) &&
          !/[?&]X-Amz-/i.test(raw) &&
          !raw.includes('/media?')
        ) {
          data.avatarUrl = raw;
        }
      }
    }
    if (dto.primaryCategory !== undefined) {
      data.primaryCategory =
        dto.primaryCategory === null || dto.primaryCategory === ''
          ? null
          : String(dto.primaryCategory).trim() || null;
    }
    if (hasSlug) {
      data.slug = String(dto.slug).trim().toLowerCase();
    }
    if (dto.onboardingComplete !== undefined) {
      data.onboardingComplete = dto.onboardingComplete;
    }
    if (dto.fanThankYouMessage !== undefined) {
      data.fanThankYouMessage =
        dto.fanThankYouMessage === null || dto.fanThankYouMessage === ''
          ? null
          : String(dto.fanThankYouMessage).trim() || null;
    }
    const prevSocials = this.parseSocialLinks(existingCreator.socialLinks);
    const nextSocials = {
      tiktok:
        dto.tiktokUrl !== undefined
          ? this.normalizeNullableUrl(dto.tiktokUrl)
          : prevSocials.tiktok,
      instagram:
        dto.instagramUrl !== undefined
          ? this.normalizeNullableUrl(dto.instagramUrl)
          : prevSocials.instagram,
      youtube:
        dto.youtubeUrl !== undefined
          ? this.normalizeNullableUrl(dto.youtubeUrl)
          : prevSocials.youtube,
    };
    if (
      dto.tiktokUrl !== undefined ||
      dto.instagramUrl !== undefined ||
      dto.youtubeUrl !== undefined
    ) {
      data.socialLinks = this.stringifySocialLinks(nextSocials);
    }

    const willOnboard =
      dto.onboardingComplete !== undefined
        ? dto.onboardingComplete
        : existingCreator.onboardingComplete;
    if (willOnboard && !hasRequiredStreamingChannel(nextSocials)) {
      throw new BadRequestException(
        'Add a TikTok or YouTube channel URL. An admin must verify it before you can generate OBS links.',
      );
    }

    const prevFp = streamingChannelFingerprint(prevSocials);
    const nextFp = streamingChannelFingerprint(nextSocials);
    const channelsChanged = prevFp !== nextFp;
    let notifyStreamReview = false;
    if (channelsChanged) {
      if (hasRequiredStreamingChannel(nextSocials)) {
        data.streamLinksSubmittedAt = new Date();
        data.streamVerifiedAt = null;
        data.streamReviewNote = null;
        notifyStreamReview = true;
      } else {
        data.streamLinksSubmittedAt = null;
        data.streamVerifiedAt = null;
        data.streamReviewNote = null;
      }
    } else if (
      hasRequiredStreamingChannel(nextSocials) &&
      !existingCreator.streamVerifiedAt &&
      !existingCreator.streamLinksSubmittedAt
    ) {
      data.streamLinksSubmittedAt = new Date();
      notifyStreamReview = true;
    }

    if (Object.keys(data).length === 0) {
      return this.serializeCreator(existingCreator);
    }

    const updated = await this.prisma.creator.update({
      where: { id: creatorId },
      data,
    });
    if (notifyStreamReview) {
      this.notifyStreamLinksSubmitted(updated, nextSocials);
    }
    return this.serializeCreator(updated);
  }

  async uploadAvatar(
    creatorId: string,
    file: { buffer?: Buffer; mimetype?: string } | undefined,
    origin: string,
  ) {
    return this.uploadMedia(creatorId, 'avatar', file, origin);
  }

  async clearAvatar(creatorId: string) {
    return this.clearMedia(creatorId, 'avatar');
  }

  async uploadMedia(
    creatorId: string,
    slotRaw: string,
    file: { buffer?: Buffer; mimetype?: string } | undefined,
    origin: string,
  ) {
    if (!isCreatorMediaSlot(slotRaw)) {
      throw new BadRequestException('Only a profile picture is stored.');
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException('Choose a photo to upload.');
    }
    const mime = (file.mimetype || '').toLowerCase();
    const ext =
      mime === 'image/png'
        ? 'png'
        : mime === 'image/webp'
          ? 'webp'
          : mime === 'image/jpeg' || mime === 'image/jpg'
            ? 'jpg'
            : null;
    if (!ext) {
      throw new BadRequestException('Use a JPEG, PNG, or WebP image.');
    }
    const maxBytes = 4 * 1024 * 1024;
    if (file.buffer.length > maxBytes) {
      throw new BadRequestException('Photo must be under 4 MB.');
    }
    const existing = await this.prisma.creator.findUnique({
      where: { id: creatorId },
      select: { avatarUrl: true, thumbnailUrl: true, coverUrl: true },
    });
    if (!existing) {
      throw new BadRequestException('Creator not found');
    }
    const column = creatorMediaColumn(slotRaw);
    const stored = await this.media.putCreatorImage({
      creatorId,
      slot: slotRaw,
      buffer: file.buffer,
      ext,
      contentType: mime || `image/${ext}`,
      origin,
      previousUrl: existing[column],
    });
    const updated = await this.prisma.creator.update({
      where: { id: creatorId },
      data: {
        [column]: stored.key,
        thumbnailUrl: null,
        coverUrl: null,
      },
    });
    await this.deleteStoredExtras(existing);
    return this.serializeCreator(updated);
  }

  async presignMedia(creatorId: string, slotRaw: string, contentTypeRaw: string) {
    if (!isCreatorMediaSlot(slotRaw)) {
      throw new BadRequestException('Only a profile picture is stored.');
    }
    const mime = (contentTypeRaw || '').toLowerCase();
    const ext =
      mime === 'image/png'
        ? 'png'
        : mime === 'image/webp'
          ? 'webp'
          : mime === 'image/jpeg' || mime === 'image/jpg'
            ? 'jpg'
            : null;
    if (!ext) {
      throw new BadRequestException('Use a JPEG, PNG, or WebP image.');
    }
    try {
      return await this.media.presignCreatorUpload({
        creatorId,
        slot: slotRaw,
        ext,
        contentType: mime,
      });
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error
          ? err.message
          : 'Could not create an upload URL. On EC2 this uses IAM role MakulutuEC2S3Role.',
      );
    }
  }

  async confirmMedia(creatorId: string, slotRaw: string, keyRaw: string) {
    if (!isCreatorMediaSlot(slotRaw)) {
      throw new BadRequestException('Only a profile picture is stored.');
    }
    const key = (keyRaw || '').trim();
    const prefix = `creators/${creatorId}/profile/${slotRaw}-`;
    if (!key.startsWith(prefix) || key.includes('..')) {
      throw new BadRequestException('Invalid storage key.');
    }
    const existing = await this.prisma.creator.findUnique({
      where: { id: creatorId },
      select: { avatarUrl: true, thumbnailUrl: true, coverUrl: true },
    });
    if (!existing) {
      throw new BadRequestException('Creator not found');
    }
    const column = creatorMediaColumn(slotRaw);
    const updated = await this.prisma.creator.update({
      where: { id: creatorId },
      data: {
        [column]: key,
        thumbnailUrl: null,
        coverUrl: null,
      },
    });
    await this.media.deleteStored(existing[column]);
    await this.deleteStoredExtras(existing);
    return this.serializeCreator(updated);
  }

  async clearMedia(creatorId: string, slotRaw: string) {
    if (!isCreatorMediaSlot(slotRaw)) {
      throw new BadRequestException('Only a profile picture is stored.');
    }
    const column = creatorMediaColumn(slotRaw);
    const existing = await this.prisma.creator.findUnique({
      where: { id: creatorId },
      select: { avatarUrl: true, thumbnailUrl: true, coverUrl: true },
    });
    if (existing?.[column]) {
      await this.media.deleteStored(existing[column]);
    }
    const updated = await this.prisma.creator.update({
      where: { id: creatorId },
      data: { avatarUrl: null, thumbnailUrl: null, coverUrl: null },
    });
    await this.deleteStoredExtras({
      thumbnailUrl: existing?.thumbnailUrl,
      coverUrl: existing?.coverUrl,
    });
    return this.serializeCreator(updated);
  }

  private async deleteStoredExtras(row: {
    thumbnailUrl?: string | null;
    coverUrl?: string | null;
  }) {
    await Promise.all([
      this.media.deleteStored(row.thumbnailUrl),
      this.media.deleteStored(row.coverUrl),
    ]);
  }

  async listPublicCreators() {
    const rows = await this.prisma.creator.findMany({
      where: {
        isActive: true,
        onboardingComplete: true,
        supportEnabled: true,
        streamVerifiedAt: { not: null },
      },
      orderBy: [{ updatedAt: 'desc' }],
      select: {
        id: true,
        slug: true,
        displayName: true,
        bio: true,
        whatIDo: true,
        packagesSummary: true,
        socialLinks: true,
        avatarUrl: true,
        primaryCategory: true,
      },
      take: 60,
    });
    const nextByCreator = await this.scheduledLives.nextLiveByCreatorIds(
      rows.map((r) => r.id),
    );
    return Promise.all(
      rows.map(async (row) => {
        const socials = this.parseSocialLinks(row.socialLinks);
        const avatarUrl = await this.media.resolveUrl(row.avatarUrl);
        return {
          slug: row.slug,
          displayName: row.displayName,
          bio: row.bio,
          whatIDo: row.whatIDo,
          packagesSummary: row.packagesSummary,
          avatarUrl,
          primaryCategory: row.primaryCategory,
          tiktokUrl: socials.tiktok,
          instagramUrl: socials.instagram,
          youtubeUrl: socials.youtube,
          nextLive: nextByCreator.get(row.id) || null,
        };
      }),
    );
  }

  async getPublicCreatorBySlug(slug: string) {
    const normalized = slug.trim().toLowerCase();
    if (!normalized) return null;
    const row = await this.prisma.creator.findFirst({
      where: {
        slug: { equals: normalized, mode: 'insensitive' },
        isActive: true,
        onboardingComplete: true,
        supportEnabled: true,
      },
      select: {
        id: true,
        slug: true,
        displayName: true,
        bio: true,
        whatIDo: true,
        packagesSummary: true,
        socialLinks: true,
        avatarUrl: true,
        primaryCategory: true,
        fanThankYouMessage: true,
      },
    });
    if (!row) return null;
    const socials = this.parseSocialLinks(row.socialLinks);
    const [supporters, upcomingLives, avatarUrl] =
      await Promise.all([
        this.publicSupporters(row.slug),
        this.scheduledLives.publicUpcomingForCreator(row.id),
        this.media.resolveUrl(row.avatarUrl),
      ]);
    return {
      slug: row.slug,
      displayName: row.displayName,
      bio: row.bio,
      whatIDo: row.whatIDo,
      packagesSummary: row.packagesSummary,
      avatarUrl,
      primaryCategory: row.primaryCategory,
      tiktokUrl: socials.tiktok,
      instagramUrl: socials.instagram,
      youtubeUrl: socials.youtube,
      thankYouMessage: row.fanThankYouMessage,
      fanThankYouMessage: row.fanThankYouMessage,
      supporters,
      upcomingLives,
    };
  }

  private async publicSupporters(slug: string) {
    const creator = await this.prisma.creator.findFirst({
      where: { slug },
      select: { id: true },
    });
    if (!creator) return [];
    const groups = await this.prisma.payment.groupBy({
      by: ['userId'],
      where: {
        creatorId: creator.id,
        status: 'COMPLETED',
        userId: { not: null },
        amount: { not: null },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 12,
    });
    const ids = groups
      .map((g) => g.userId)
      .filter((id): id is string => Boolean(id));
    if (ids.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        tiktokUsername: true,
        fan: { select: { showOnLeaderboard: true, avatarUrl: true, name: true } },
      },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    const ranked = groups
      .map((g, idx) => {
        const u = byId.get(g.userId as string);
        if (!u) return null;
        if (u.fan && !u.fan.showOnLeaderboard) return null;
        return {
          rank: idx + 1,
          displayName:
            u.fan?.name?.trim() ||
            u.name?.trim() ||
            (u.tiktokUsername ? `@${u.tiktokUsername}` : 'Supporter'),
          tiktokUsername: u.tiktokUsername,
          avatarUrl: u.fan?.avatarUrl,
          totalKes: Math.round(Number(g._sum.amount ?? 0) * 100) / 100,
        };
      })
      .filter(Boolean)
      .slice(0, 8) as Array<{
      rank: number;
      displayName: string;
      tiktokUsername: string | null;
      avatarUrl: string | null;
      totalKes: number;
    }>;
    return Promise.all(
      ranked.map(async (row) => ({
        ...row,
        avatarUrl: await this.media.resolveUrl(row.avatarUrl),
      })),
    );
  }

  async verifyEmail(tokenRaw: string | undefined) {
    const token = (tokenRaw || '').trim();
    if (!token) throw new BadRequestException('Missing verification token');
    const tokenHash = this.hashVerifyToken(token);
    const creator = await this.prisma.creator.findFirst({
      where: {
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: { gt: new Date() },
      },
    });
    if (!creator) {
      throw new BadRequestException('Verification code is invalid or expired');
    }
    const updated = await this.prisma.creator.update({
      where: { id: creator.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
      },
    });
    return {
      ok: true,
      message: 'Email verified successfully. You can now sign in.',
      creator: await this.serializeCreator(updated),
    };
  }

  async verifyEmailOtp(emailRaw: string, codeRaw: string) {
    const email = emailRaw.trim().toLowerCase();
    const code = codeRaw.trim();
    const creator = await this.prisma.creator.findUnique({ where: { email } });
    if (!creator?.emailVerificationTokenHash || !creator.emailVerificationExpiresAt) {
      throw new UnauthorizedException('Request a new code first');
    }
    if (creator.emailVerifiedAt) {
      return {
        ok: true,
        message: 'Email is already verified. You can sign in.',
      };
    }
    if (creator.emailVerificationExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Code has expired');
    }
    const expected = hashEmailOtp(email, code);
    if (expected !== creator.emailVerificationTokenHash) {
      throw new UnauthorizedException('Invalid code');
    }
    await this.prisma.creator.update({
      where: { id: creator.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
      },
    });
    return {
      ok: true,
      message: 'Email verified successfully. You can now sign in.',
    };
  }

  async resendVerificationEmail(emailRaw: string) {
    const email = (emailRaw || '').trim().toLowerCase();
    const creator = await this.prisma.creator.findUnique({
      where: { email },
    });
    if (!creator) {
      return {
        ok: true,
        message: 'If this email exists, a verification code has been sent.',
      };
    }
    if (creator.emailVerifiedAt) {
      return { ok: true, message: 'Email is already verified.' };
    }
    this.assertEmailOtpResendAllowed(creator.emailVerificationExpiresAt);
    const code = newEmailOtp();
    await this.prisma.creator.update({
      where: { id: creator.id },
      data: {
        emailVerificationTokenHash: hashEmailOtp(email, code),
        emailVerificationExpiresAt: new Date(Date.now() + EMAIL_OTP_TTL_MS),
      },
    });
    this.queueVerificationEmail(creator.email, code, creator.displayName);
    return {
      ok: true,
      message: 'We sent a new 6-digit code to your email.',
      ...this.devOtpPayload(code),
    };
  }

  async forgotPassword(emailRaw: string) {
    const email = (emailRaw || '').trim().toLowerCase();
    const creator = await this.prisma.creator.findUnique({
      where: { email },
    });
    const generic = {
      ok: true as const,
      message:
        'If an account exists for this email, we sent password reset instructions.',
    };
    if (!creator?.emailVerifiedAt || !creator.isActive) {
      return generic;
    }
    const token = this.newVerifyToken();
    await this.prisma.creator.update({
      where: { id: creator.id },
      data: {
        passwordResetTokenHash: this.hashVerifyToken(token),
        passwordResetExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });
    await this.sendPasswordResetEmail(creator.email, token, creator.displayName);
    return generic;
  }

  async resetPassword(tokenRaw: string, newPassword: string) {
    const token = (tokenRaw || '').trim();
    if (!token) {
      throw new BadRequestException('Missing reset token');
    }
    const tokenHash = this.hashVerifyToken(token);
    const creator = await this.prisma.creator.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { gt: new Date() },
      },
    });
    if (!creator) {
      throw new BadRequestException('Reset link is invalid or has expired');
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.creator.update({
      where: { id: creator.id },
      data: {
        password: hashed,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });
    return {
      ok: true,
      message: 'Your password has been updated. You can sign in now.',
    };
  }

  private async issueToken(creator: Creator) {
    const payload = {
      sub: creator.id,
      email: creator.email,
      kind: 'creator',
    };
    const accessToken = this.jwtService.sign(payload);
    return {
      accessToken,
      creator: await this.serializeCreator(creator),
    };
  }

  private isDev(): boolean {
    return this.config.get<string>('NODE_ENV') !== 'production';
  }

  private devOtpPayload(code: string): { debugOtp?: string } {
    return this.isDev() ? { debugOtp: code } : {};
  }

  private assertEmailOtpResendAllowed(expiresAt: Date | null | undefined) {
    if (!expiresAt) return;
    const remaining = expiresAt.getTime() - Date.now();
    if (remaining > EMAIL_OTP_TTL_MS - EMAIL_OTP_RESEND_MS) {
      throw new BadRequestException('Wait a moment before requesting another code');
    }
  }

  private newVerifyToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashVerifyToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private frontendOrigin(): string {
    const raw =
      this.config.get<string>('FRONTEND_URL')?.trim() || 'http://localhost:3000';
    return raw.replace(/\/+$/, '');
  }

  private passwordResetFrontendUrl(token: string): string {
    return `${this.frontendOrigin()}/creator/reset-password?token=${encodeURIComponent(token)}`;
  }

  private async sendVerificationEmail(
    toEmail: string,
    code: string,
    displayName: string,
  ): Promise<void> {
    const recipientName = displayName?.trim() || 'Creator';
    await this.outboundMail.sendTransactional(
      emailOtpMail({
        toEmail,
        toName: recipientName,
        code,
        role: 'creator',
      }),
    );
  }

  private async sendPasswordResetEmail(
    toEmail: string,
    token: string,
    displayName: string,
  ): Promise<void> {
    const resetUrl = this.passwordResetFrontendUrl(token);
    const recipientName = displayName?.trim() || 'Creator';
    const toAddr = toEmail.trim().toLowerCase();
    const subject = 'Reset your creator password';
    const text = `Hi ${recipientName},\n\nReset your password by opening this link:\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.\n`;
    const html = `<p>Hi ${recipientName},</p><p>Reset your password by clicking the link below:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour.</p><p>If you did not request this, you can ignore this email.</p>`;
    await this.outboundMail.sendTransactional({
      toEmail: toAddr,
      toName: recipientName,
      subject,
      text,
      html,
      devLog: { label: 'password reset link', detail: `${toAddr}: ${resetUrl}` },
    });
  }

  private storageKeyFromAvatarInput(raw: string): string | null {
    const bucket = this.config.get<string>('AWS_S3_BUCKET')?.trim() || '';
    if (!bucket) return null;
    return extractStoredS3Key(raw, bucket);
  }

  private async serializeCreator(creator: Creator) {
    const socials = this.parseSocialLinks(creator.socialLinks);
    const [avatarUrl] = await Promise.all([
      this.media.resolveUrl(creator.avatarUrl),
    ]);
    return {
      id: creator.id,
      email: creator.email,
      slug: creator.slug,
      displayName: creator.displayName,
      bio: creator.bio,
      whatIDo: creator.whatIDo,
      packagesSummary: creator.packagesSummary,
      avatarUrl,
      primaryCategory: creator.primaryCategory,
      tiktokUrl: socials.tiktok,
      instagramUrl: socials.instagram,
      youtubeUrl: socials.youtube,
      onboardingComplete: creator.onboardingComplete,
      isActive: creator.isActive,
      supportEnabled: creator.supportEnabled,
      fanThankYouMessage: creator.fanThankYouMessage,
      thankYouMessage: creator.fanThankYouMessage,
      hasPassword: Boolean(creator.password),
      hasGoogle: Boolean(creator.googleId),
      emailVerifiedAt: creator.emailVerifiedAt,
      streamVerifiedAt: creator.streamVerifiedAt,
      streamLinksSubmittedAt: creator.streamLinksSubmittedAt,
      streamReviewNote: creator.streamReviewNote,
      streamVerified: Boolean(creator.streamVerifiedAt),
      streamVerificationStatus: streamVerificationStatus(creator),
      lastLogin: creator.lastLogin,
      createdAt: creator.createdAt,
    };
  }

  private reviewInboxEmail(): string | null {
    const inbox =
      this.config.get<string>('ADMIN_REVIEW_EMAIL')?.trim() ||
      this.config.get<string>('EMAIL_REPLY_TO')?.trim() ||
      '';
    return inbox || null;
  }

  private notifyStreamLinksSubmitted(
    creator: Creator,
    links: { tiktok: string | null; instagram: string | null; youtube: string | null },
  ) {
    const name = creator.displayName?.trim() || 'Streamer';
    const tiktok = links.tiktok || '(none)';
    const youtube = links.youtube || '(none)';
    const instagram = links.instagram || '(none)';
    this.outboundMail.sendInBackground({
      toEmail: creator.email,
      toName: name,
      subject: 'We received your streaming links',
      text: `Hi ${name},\n\nThanks for submitting your streaming channels. An admin will review your TikTok or YouTube link and email you when you can generate OBS overlays.\n\nTikTok: ${tiktok}\nYouTube: ${youtube}\nInstagram: ${instagram}\n\nYou will get another email when the review is complete.\n`,
      html: `<p>Hi ${name},</p><p>Thanks for submitting your streaming channels. An admin will review your TikTok or YouTube link and email you when you can generate OBS overlays.</p><p>TikTok: ${tiktok}<br/>YouTube: ${youtube}<br/>Instagram: ${instagram}</p><p>You will get another email when the review is complete.</p>`,
      devLog: {
        label: 'stream links submitted (creator)',
        detail: creator.email,
      },
    });
    const inbox = this.reviewInboxEmail();
    if (inbox && inbox.toLowerCase() !== creator.email.trim().toLowerCase()) {
      this.outboundMail.sendInBackground({
        toEmail: inbox,
        toName: 'Makulutu admin',
        subject: `Review streamer channels: ${name} (@${creator.slug})`,
        text: `${name} (${creator.email}) submitted streaming links for admin review.\n\nPublic page: /${creator.slug}\nTikTok: ${tiktok}\nYouTube: ${youtube}\nInstagram: ${instagram}\n\nApprove or reject in the admin dashboard (Streamers tab).\n`,
        html: `<p><strong>${name}</strong> (${creator.email}) submitted streaming links for admin review.</p><p>Public page: /${creator.slug}</p><p>TikTok: ${tiktok}<br/>YouTube: ${youtube}<br/>Instagram: ${instagram}</p><p>Approve or reject in the admin dashboard (Streamers tab).</p>`,
        devLog: {
          label: 'stream links submitted (admin)',
          detail: inbox,
        },
      });
    }
  }

  private parseSocialLinks(raw: string | null | undefined) {
    return parseSocialLinksJson(raw);
  }

  private stringifySocialLinks(input: {
    tiktok: string | null;
    instagram: string | null;
    youtube: string | null;
  }): string | null {
    if (!input.tiktok && !input.instagram && !input.youtube) return null;
    return JSON.stringify(input);
  }

  private normalizeNullableUrl(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    return trimmed;
  }

  /** Slug for the primary platform operator workspace (not "admin" / moderator usernames). */
  private platformCreatorSlug(): string {
    const s = (process.env.PLATFORM_CREATOR_SLUG || 'makulutu')
      .trim()
      .toLowerCase();
    return s.length >= 3 ? s.slice(0, 64) : 'makulutu';
  }

  private platformCreatorDisplayName(): string {
    const d = (process.env.PLATFORM_CREATOR_DISPLAY_NAME || 'Makulutu').trim();
    return d.length > 0 ? d.slice(0, 80) : 'Makulutu';
  }

  /** Usernames that must not become public creator slugs (operator / staff accounts). */
  private isReservedOperatorUsername(username: string | null | undefined): boolean {
    const u = (username || '').trim().toLowerCase();
    if (!u) return true;
    const reserved = new Set([
      'admin',
      'administrator',
      'moderator',
      'mod',
      'superadmin',
      'super_admin',
      'root',
    ]);
    return reserved.has(u);
  }

  /**
   * When a platform Admin row signs into the creator portal, attach to or create
   * a proper creator profile — never slug "admin" or staff-looking URLs.
   */
  private async ensureCreatorForPlatformOperator(admin: {
    id: string;
    username: string | null;
    email: string | null;
    password: string;
  }): Promise<Creator> {
    const preferredBaseSlug = this.isReservedOperatorUsername(admin.username)
      ? this.platformCreatorSlug()
      : this.toSlug(admin.username || admin.email || 'creator');

    const existingByPreferredSlug = await this.prisma.creator.findUnique({
      where: { slug: preferredBaseSlug },
    });

    if (existingByPreferredSlug) {
      return this.prisma.creator.update({
        where: { id: existingByPreferredSlug.id },
        data: {
          password: admin.password,
          emailVerifiedAt: existingByPreferredSlug.emailVerifiedAt ?? new Date(),
          emailVerificationTokenHash: null,
          emailVerificationExpiresAt: null,
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
          ...(this.isReservedOperatorUsername(admin.username)
            ? {
                displayName:
                  existingByPreferredSlug.displayName?.trim() ||
                  this.platformCreatorDisplayName(),
              }
            : {}),
        },
      });
    }

    const slug = await this.reserveUniqueSlug(preferredBaseSlug);
    const displayName = this.isReservedOperatorUsername(admin.username)
      ? this.platformCreatorDisplayName()
      : admin.username?.trim() || slug;

    const adminEmail = (admin.email || '').trim().toLowerCase();
    let email = adminEmail || `${slug}@creator.local`;
    const emailOwner = await this.prisma.creator.findUnique({
      where: { email },
      select: { id: true },
    });
    if (emailOwner) {
      email = `${slug}-${Date.now()}@creator.local`;
    }

    return this.prisma.creator.create({
      data: {
        email,
        password: admin.password,
        slug,
        displayName,
        bio: null,
        onboardingComplete: false,
        emailVerifiedAt: new Date(),
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });
  }

  private toSlug(input: string): string {
    const raw = input
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const safe = raw.length >= 3 ? raw : 'creator';
    return safe.slice(0, 64);
  }

  private async reserveUniqueSlug(base: string): Promise<string> {
    let candidate = base || 'creator';
    let i = 1;
    while (true) {
      const exists = await this.prisma.creator.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
      i += 1;
      candidate = `${base}-${i}`.slice(0, 64);
    }
  }
}
