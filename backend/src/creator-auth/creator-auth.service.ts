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
import { LoginCreatorDto } from './dto/login-creator.dto';
import { SignupCreatorDto } from './dto/signup-creator.dto';
import { UpdateCreatorProfileDto } from './dto/update-creator-profile.dto';
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
  ) {}

  async signup(dto: SignupCreatorDto) {
    const email = dto.email.trim().toLowerCase();
    const slug = dto.slug.trim().toLowerCase();
    const existing = await this.prisma.creator.findFirst({
      where: { OR: [{ email }, { slug }] },
      select: { id: true, email: true, slug: true },
    });
    if (existing) {
      throw new BadRequestException(
        existing.email === email
          ? 'Email is already registered'
          : 'Slug is already taken',
      );
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const token = this.newVerifyToken();
    const tokenHash = this.hashVerifyToken(token);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
    const created = await this.prisma.creator.create({
      data: {
        email,
        password: hashed,
        slug,
        displayName: dto.displayName.trim(),
        bio: dto.bio?.trim() || null,
        whatIDo: dto.whatIDo?.trim() || null,
        packagesSummary: dto.packagesSummary?.trim() || null,
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: expiresAt,
      },
    });
    await this.sendVerificationEmail(created.email, token, created.displayName);
    return {
      ok: true,
      requiresEmailVerification: true,
      message: 'Account created. Check your email and open the verification link.',
    };
  }

  async login(dto: LoginCreatorDto) {
    const identifier = dto.identifier.trim();
    if (!identifier) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const identifierLower = identifier.toLowerCase();

    let creator = await this.findCreatorByIdentifier(identifierLower);

    if (creator) {
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
        'Please verify your email first. Check your inbox for the verification link.',
      );
    }
    await this.prisma.creator.update({
      where: { id: creator.id },
      data: { lastLogin: new Date() },
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
    return this.serializeCreator(creator);
  }

  async updateProfile(creatorId: string, dto: UpdateCreatorProfileDto) {
    const hasSlug =
      dto.slug !== undefined &&
      dto.slug !== null &&
      String(dto.slug).trim().length > 0;
    if (hasSlug) {
      const slug = String(dto.slug).trim().toLowerCase();
      const existing = await this.prisma.creator.findFirst({
        where: { slug, id: { not: creatorId } },
        select: { id: true },
      });
      if (existing) throw new BadRequestException('Slug is already taken');
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
      data.avatarUrl =
        dto.avatarUrl === null || dto.avatarUrl === ''
          ? null
          : String(dto.avatarUrl).trim() || null;
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
    if (
      dto.tiktokUrl !== undefined ||
      dto.instagramUrl !== undefined ||
      dto.youtubeUrl !== undefined
    ) {
      const existing = await this.prisma.creator.findUnique({
        where: { id: creatorId },
        select: { socialLinks: true },
      });
      if (!existing) throw new UnauthorizedException('Creator not found');
      const prev = this.parseSocialLinks(existing.socialLinks);
      const next = {
        tiktok:
          dto.tiktokUrl !== undefined
            ? this.normalizeNullableUrl(dto.tiktokUrl)
            : prev.tiktok,
        instagram:
          dto.instagramUrl !== undefined
            ? this.normalizeNullableUrl(dto.instagramUrl)
            : prev.instagram,
        youtube:
          dto.youtubeUrl !== undefined
            ? this.normalizeNullableUrl(dto.youtubeUrl)
            : prev.youtube,
      };
      data.socialLinks = this.stringifySocialLinks(next);
    }

    if (Object.keys(data).length === 0) {
      const creator = await this.prisma.creator.findUnique({
        where: { id: creatorId },
      });
      if (!creator) throw new UnauthorizedException('Creator not found');
      return this.serializeCreator(creator);
    }

    const updated = await this.prisma.creator.update({
      where: { id: creatorId },
      data,
    });
    return this.serializeCreator(updated);
  }

  async listPublicCreators() {
    const rows = await this.prisma.creator.findMany({
      where: {
        isActive: true,
        onboardingComplete: true,
        supportEnabled: true,
      },
      orderBy: [{ updatedAt: 'desc' }],
      select: {
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
    return rows.map((row) => {
      const socials = this.parseSocialLinks(row.socialLinks);
      return {
        slug: row.slug,
        displayName: row.displayName,
        bio: row.bio,
        whatIDo: row.whatIDo,
        packagesSummary: row.packagesSummary,
        avatarUrl: row.avatarUrl,
        primaryCategory: row.primaryCategory,
        tiktokUrl: socials.tiktok,
        instagramUrl: socials.instagram,
        youtubeUrl: socials.youtube,
      };
    });
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
        slug: true,
        displayName: true,
        bio: true,
        whatIDo: true,
        packagesSummary: true,
        socialLinks: true,
        avatarUrl: true,
        primaryCategory: true,
      },
    });
    if (!row) return null;
    const socials = this.parseSocialLinks(row.socialLinks);
    return {
      slug: row.slug,
      displayName: row.displayName,
      bio: row.bio,
      whatIDo: row.whatIDo,
      packagesSummary: row.packagesSummary,
      avatarUrl: row.avatarUrl,
      primaryCategory: row.primaryCategory,
      tiktokUrl: socials.tiktok,
      instagramUrl: socials.instagram,
      youtubeUrl: socials.youtube,
    };
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
      throw new BadRequestException('Verification link is invalid or expired');
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
      creator: this.serializeCreator(updated),
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
        message: 'If this email exists, a verification link has been sent.',
      };
    }
    if (creator.emailVerifiedAt) {
      return { ok: true, message: 'Email is already verified.' };
    }
    const token = this.newVerifyToken();
    await this.prisma.creator.update({
      where: { id: creator.id },
      data: {
        emailVerificationTokenHash: this.hashVerifyToken(token),
        emailVerificationExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });
    await this.sendVerificationEmail(creator.email, token, creator.displayName);
    return {
      ok: true,
      message: 'Verification email sent. Please check your inbox.',
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

  private issueToken(creator: Creator) {
    const payload = {
      sub: creator.id,
      email: creator.email,
      kind: 'creator',
    };
    const accessToken = this.jwtService.sign(payload);
    return {
      accessToken,
      creator: this.serializeCreator(creator),
    };
  }

  private newVerifyToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashVerifyToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private verificationFrontendUrl(token: string): string {
    const base =
      this.config.get<string>('FRONTEND_URL')?.trim() || 'http://localhost:3000';
    return `${base}/creator/verify-email?token=${encodeURIComponent(token)}`;
  }

  private passwordResetFrontendUrl(token: string): string {
    const base =
      this.config.get<string>('FRONTEND_URL')?.trim() || 'http://localhost:3000';
    return `${base}/creator/reset-password?token=${encodeURIComponent(token)}`;
  }

  private async sendVerificationEmail(
    toEmail: string,
    token: string,
    displayName: string,
  ): Promise<void> {
    const verifyUrl = this.verificationFrontendUrl(token);
    const recipientName = displayName?.trim() || 'Creator';
    const toAddr = toEmail.trim().toLowerCase();
    const subject = 'Verify your creator account';
    const text = `Hi ${recipientName},\n\nVerify your email by opening this link:\n${verifyUrl}\n\nThis link expires in 24 hours.\n`;
    const html = `<p>Hi ${recipientName},</p><p>Verify your email by clicking the link below:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 24 hours.</p>`;
    await this.outboundMail.sendTransactional({
      toEmail: toAddr,
      toName: recipientName,
      subject,
      text,
      html,
      devLog: { label: 'verification link', detail: `${toAddr}: ${verifyUrl}` },
    });
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

  private serializeCreator(creator: Creator) {
    const socials = this.parseSocialLinks(creator.socialLinks);
    return {
      id: creator.id,
      email: creator.email,
      slug: creator.slug,
      displayName: creator.displayName,
      bio: creator.bio,
      whatIDo: creator.whatIDo,
      packagesSummary: creator.packagesSummary,
      avatarUrl: creator.avatarUrl,
      primaryCategory: creator.primaryCategory,
      tiktokUrl: socials.tiktok,
      instagramUrl: socials.instagram,
      youtubeUrl: socials.youtube,
      onboardingComplete: creator.onboardingComplete,
      isActive: creator.isActive,
      supportEnabled: creator.supportEnabled,
      emailVerifiedAt: creator.emailVerifiedAt,
      lastLogin: creator.lastLogin,
      createdAt: creator.createdAt,
    };
  }

  private parseSocialLinks(raw: string | null | undefined): {
    tiktok: string | null;
    instagram: string | null;
    youtube: string | null;
  } {
    if (!raw) return { tiktok: null, instagram: null, youtube: null };
    try {
      const parsed = JSON.parse(raw) as {
        tiktok?: unknown;
        instagram?: unknown;
        youtube?: unknown;
      };
      return {
        tiktok: typeof parsed.tiktok === 'string' ? parsed.tiktok : null,
        instagram: typeof parsed.instagram === 'string' ? parsed.instagram : null,
        youtube: typeof parsed.youtube === 'string' ? parsed.youtube : null,
      };
    } catch {
      return { tiktok: null, instagram: null, youtube: null };
    }
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
