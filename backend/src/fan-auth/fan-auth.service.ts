import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Fan } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import {
  kenyaMsisdnAliases,
  normalizeKenyaMsisdn,
} from '../common/utils/mpesa-msisdn';
import { GoogleTokenService } from '../common/google-auth/google-token.service';
import { OutboundMailService } from '../mail/outbound-mail.service';
import { MediaStorageService } from '../common/media/media-storage.service';
import {
  EMAIL_OTP_TTL_MS,
  emailOtpMail,
  emailOtpTooSoon,
  hashEmailOtp,
  newEmailOtp,
} from '../common/utils/email-otp';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginFanDto } from './dto/login-fan.dto';
import { SignupFanDto } from './dto/signup-fan.dto';
import { UpdateFanProfileDto } from './dto/update-fan-profile.dto';
import {
  DateOfBirthError,
  parseAdultDateOfBirth,
} from '../common/utils/date-of-birth';

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_MS = 45 * 1000;

@Injectable()
export class FanAuthService {
  private readonly logger = new Logger(FanAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly whatsapp: WhatsAppService,
    private readonly google: GoogleTokenService,
    private readonly outboundMail: OutboundMailService,
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

  async signupWithEmail(dto: SignupFanDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.fan.findUnique({ where: { email } });
    if (existing?.emailVerifiedAt) {
      throw new BadRequestException('Email is already registered. Sign in instead.');
    }
    const hashed = await bcrypt.hash(dto.password, 10);
    const name = dto.name?.trim() || existing?.name || null;
    const dateOfBirth = this.requireAdultDob(dto.dateOfBirth);
    if (existing) {
      this.assertEmailOtpResendAllowed(existing.emailOtpSentAt);
    }
    const code = newEmailOtp();
    const otp = {
      password: hashed,
      name,
      dateOfBirth,
      emailOtpHash: hashEmailOtp(email, code),
      emailOtpExpiresAt: new Date(Date.now() + EMAIL_OTP_TTL_MS),
      emailOtpSentAt: new Date(),
    };
    if (existing) {
      await this.prisma.fan.update({ where: { id: existing.id }, data: otp });
    } else {
      await this.prisma.fan.create({
        data: { email, ...otp },
      });
    }
    this.queueVerificationEmail(email, code, name || 'Fan');
    return {
      ok: true,
      requiresEmailVerification: true,
      email,
      message: 'Account created. Enter the 6-digit code we sent to your email.',
      ...(this.isDev() ? { debugOtp: code } : {}),
    };
  }

  async verifyEmailOtp(emailRaw: string, codeRaw: string) {
    const email = emailRaw.trim().toLowerCase();
    const code = codeRaw.trim();
    const fan = await this.prisma.fan.findUnique({ where: { email } });
    if (!fan?.emailOtpHash || !fan.emailOtpExpiresAt) {
      throw new UnauthorizedException('Request a new code first');
    }
    if (!fan.isActive) {
      throw new UnauthorizedException('Fan account is inactive');
    }
    if (fan.emailVerifiedAt) {
      const updated = await this.prisma.fan.update({
        where: { id: fan.id },
        data: { lastLogin: new Date() },
      });
      return this.issueToken(updated);
    }
    if (fan.emailOtpExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Code has expired');
    }
    if (hashEmailOtp(email, code) !== fan.emailOtpHash) {
      throw new UnauthorizedException('Invalid code');
    }
    const updated = await this.prisma.fan.update({
      where: { id: fan.id },
      data: {
        emailVerifiedAt: new Date(),
        emailOtpHash: null,
        emailOtpExpiresAt: null,
        lastLogin: new Date(),
      },
    });
    return this.issueToken(updated);
  }

  async resendVerificationEmail(emailRaw: string) {
    const email = (emailRaw || '').trim().toLowerCase();
    const fan = await this.prisma.fan.findUnique({ where: { email } });
    if (!fan) {
      return {
        ok: true,
        message: 'If this email exists, a verification code has been sent.',
      };
    }
    if (fan.emailVerifiedAt) {
      return { ok: true, message: 'Email is already verified.' };
    }
    this.assertEmailOtpResendAllowed(fan.emailOtpSentAt);
    const code = newEmailOtp();
    await this.prisma.fan.update({
      where: { id: fan.id },
      data: {
        emailOtpHash: hashEmailOtp(email, code),
        emailOtpExpiresAt: new Date(Date.now() + EMAIL_OTP_TTL_MS),
        emailOtpSentAt: new Date(),
      },
    });
    this.queueVerificationEmail(email, code, fan.name || 'Fan');
    return {
      ok: true,
      message: 'We sent a new 6-digit code to your email.',
      ...(this.isDev() ? { debugOtp: code } : {}),
    };
  }

  /**
   * Attach guest website checkouts (User.fanId null) to this fan by matching
   * M-Pesa / WhatsApp numbers so mobile Activity matches web payments.
   */
  async claimGuestSupportRecords(fan: Fan): Promise<void> {
    const phones = kenyaMsisdnAliases(fan.phone);
    if (phones.length === 0) return;
    try {
      await this.prisma.user.updateMany({
        where: {
          fanId: null,
          OR: [
            { mpesaMobile: { in: phones } },
            { whatsappNumber: { in: phones } },
          ],
        },
        data: { fanId: fan.id },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Could not claim guest support records: ${msg}`);
    }
  }

  async requestOtp(dto: RequestOtpDto) {
    const phone = this.requirePhone(dto.phone);
    const now = new Date();
    let fan = await this.prisma.fan.findUnique({ where: { phone } });
    if (fan?.otpSentAt && now.getTime() - fan.otpSentAt.getTime() < OTP_RESEND_MS) {
      throw new BadRequestException('Wait a moment before requesting another code');
    }
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const otpHash = this.hashOtp(phone, code);
    const otpExpiresAt = new Date(now.getTime() + OTP_TTL_MS);
    if (!fan) {
      fan = await this.prisma.fan.create({
        data: {
          phone,
          name: dto.name?.trim() || null,
          dateOfBirth: this.requireAdultDob(dto.dateOfBirth),
          otpHash,
          otpExpiresAt,
          otpSentAt: now,
        },
      });
    } else {
      if (!fan.isActive) {
        throw new UnauthorizedException('Fan account is inactive');
      }
      fan = await this.prisma.fan.update({
        where: { id: fan.id },
        data: {
          otpHash,
          otpExpiresAt,
          otpSentAt: now,
          ...(dto.name?.trim() && !fan.name ? { name: dto.name.trim() } : {}),
        },
      });
    }

    const message = `Your Makulutu login code is ${code}. It expires in 10 minutes.`;
    const sent = await this.whatsapp.sendMessage(phone, message);
    if (!sent) {
      this.logger.warn(`Fan OTP WhatsApp not sent to ${phone}`);
    }

    const isDev = this.config.get<string>('NODE_ENV') !== 'production';
    return {
      ok: true,
      phone,
      expiresInSec: OTP_TTL_MS / 1000,
      delivered: sent,
      ...(isDev ? { debugOtp: code } : {}),
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const phone = this.requirePhone(dto.phone);
    const fan = await this.prisma.fan.findUnique({ where: { phone } });
    if (!fan || !fan.otpHash || !fan.otpExpiresAt) {
      throw new UnauthorizedException('Request a new code first');
    }
    if (!fan.isActive) {
      throw new UnauthorizedException('Fan account is inactive');
    }
    if (fan.otpExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Code has expired');
    }
    const expected = this.hashOtp(phone, dto.code.trim());
    if (expected !== fan.otpHash) {
      throw new UnauthorizedException('Invalid code');
    }
    const updated = await this.prisma.fan.update({
      where: { id: fan.id },
      data: {
        otpHash: null,
        otpExpiresAt: null,
        lastLogin: new Date(),
        ...(dto.name?.trim() ? { name: dto.name.trim() } : {}),
        ...(dto.tiktokUsername?.trim()
          ? { tiktokUsername: dto.tiktokUsername.trim().replace(/^@+/, '') }
          : {}),
      },
    });
    return this.issueToken(updated);
  }

  async loginWithPassword(dto: LoginFanDto) {
    const raw = (dto.identifier || dto.phone || '').trim();
    if (!raw) {
      throw new BadRequestException('Enter your email or phone number');
    }
    const fan = await this.findFanByLoginIdentifier(raw);
    if (!fan?.password || !fan.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, fan.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (fan.email && !fan.emailVerifiedAt) {
      throw new UnauthorizedException(
        'Please verify your email first. Enter the 6-digit code we sent, or request a new one.',
      );
    }
    const updated = await this.prisma.fan.update({
      where: { id: fan.id },
      data: { lastLogin: new Date() },
    });
    return this.issueToken(updated);
  }

  async loginWithGoogle(idToken: string, dateOfBirthRaw?: string) {
    const profile = await this.google.verifyIdToken(idToken);
    const byGoogle = await this.prisma.fan.findUnique({
      where: { googleId: profile.googleId },
    });
    const byEmail = await this.prisma.fan.findUnique({
      where: { email: profile.email },
    });
    let fan = byGoogle || byEmail;
    if (fan && byGoogle && byEmail && byGoogle.id !== byEmail.id) {
      throw new BadRequestException('This Google account cannot be linked');
    }
    if (fan && fan.googleId && fan.googleId !== profile.googleId) {
      throw new BadRequestException('Email is already in use');
    }
    if (fan && !fan.isActive) {
      throw new UnauthorizedException('Fan account is inactive');
    }
    if (!fan) {
      fan = await this.prisma.fan.create({
        data: {
          email: profile.email,
          googleId: profile.googleId,
          name: profile.name,
          dateOfBirth: this.requireAdultDob(dateOfBirthRaw),
          emailVerifiedAt: new Date(),
          lastLogin: new Date(),
        },
      });
    } else {
      fan = await this.prisma.fan.update({
        where: { id: fan.id },
        data: {
          googleId: fan.googleId || profile.googleId,
          email: fan.email || profile.email,
          emailVerifiedAt: fan.emailVerifiedAt ?? new Date(),
          name: fan.name || profile.name,
          lastLogin: new Date(),
        },
      });
    }
    return this.issueToken(fan);
  }

  async setPassword(fanId: string, password: string) {
    const hashed = await bcrypt.hash(password, 10);
    const fan = await this.prisma.fan.update({
      where: { id: fanId },
      data: { password: hashed },
    });
    return { ok: true, fan: await this.serializeFan(fan) };
  }

  async me(fanId: string) {
    const fan = await this.prisma.fan.findUnique({ where: { id: fanId } });
    if (!fan) {
      throw new UnauthorizedException('Fan not found');
    }
    return this.serializeFan(fan);
  }

  async updateProfile(fanId: string, dto: UpdateFanProfileDto) {
    const data: {
      name?: string | null;
      tiktokUsername?: string | null;
      email?: string | null;
      phone?: string | null;
      locale?: string;
      showOnLeaderboard?: boolean;
      expoPushToken?: string | null;
      emailVerifiedAt?: Date | null;
    } = {};
    if (dto.name !== undefined) data.name = dto.name.trim() || null;
    if (dto.tiktokUsername !== undefined) {
      data.tiktokUsername = dto.tiktokUsername.trim().replace(/^@+/, '') || null;
    }
    if (dto.locale !== undefined) data.locale = dto.locale === 'sw' ? 'sw' : 'en';
    if (dto.showOnLeaderboard !== undefined) {
      data.showOnLeaderboard = dto.showOnLeaderboard;
    }
    if (dto.expoPushToken !== undefined) {
      data.expoPushToken = dto.expoPushToken.trim() || null;
    }
    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      if (email) {
        const taken = await this.prisma.fan.findFirst({
          where: { email, NOT: { id: fanId } },
          select: { id: true },
        });
        if (taken) {
          throw new BadRequestException('Email is already in use');
        }
        data.email = email;
        const current = await this.prisma.fan.findUnique({
          where: { id: fanId },
          select: { email: true },
        });
        if (current?.email !== email) {
          data.emailVerifiedAt = null;
        }
      } else {
        data.email = null;
      }
    }
    if (dto.phone !== undefined) {
      const raw = dto.phone.trim();
      if (raw) {
        const phone = this.requirePhone(raw);
        const taken = await this.prisma.fan.findFirst({
          where: { phone, NOT: { id: fanId } },
          select: { id: true },
        });
        if (taken) {
          throw new BadRequestException('Phone number is already in use');
        }
        data.phone = phone;
      } else {
        data.phone = null;
      }
    }
    const fan = await this.prisma.fan.update({
      where: { id: fanId },
      data,
    });
    if (fan.phone) {
      await this.claimGuestSupportRecords(fan);
    }
    return this.serializeFan(fan);
  }

  async uploadAvatar(
    fanId: string,
    file: { buffer?: Buffer; mimetype?: string } | undefined,
    origin: string,
  ) {
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
    if (file.buffer.length > 4 * 1024 * 1024) {
      throw new BadRequestException('Photo must be under 4 MB.');
    }
    const existing = await this.prisma.fan.findUnique({
      where: { id: fanId },
      select: { avatarUrl: true },
    });
    const stored = await this.media.putFanAvatar({
      fanId,
      buffer: file.buffer,
      ext,
      contentType: mime || `image/${ext}`,
      origin,
      previousUrl: existing?.avatarUrl,
    });
    const updated = await this.prisma.fan.update({
      where: { id: fanId },
      data: { avatarUrl: stored.key },
    });
    return this.serializeFan(updated);
  }

  async clearAvatar(fanId: string) {
    const existing = await this.prisma.fan.findUnique({
      where: { id: fanId },
      select: { avatarUrl: true },
    });
    if (existing?.avatarUrl) {
      await this.media.deleteStored(existing.avatarUrl);
    }
    const updated = await this.prisma.fan.update({
      where: { id: fanId },
      data: { avatarUrl: null },
    });
    return this.serializeFan(updated);
  }

  async validateFanById(id: string): Promise<Fan | null> {
    return this.prisma.fan.findUnique({ where: { id } });
  }

  async serializeFan(fan: Fan) {
    return {
      id: fan.id,
      phone: fan.phone,
      email: fan.email,
      name: fan.name,
      tiktokUsername: fan.tiktokUsername,
      avatarUrl: await this.media.resolveUrl(fan.avatarUrl),
      locale: fan.locale || 'en',
      showOnLeaderboard: fan.showOnLeaderboard,
      hasPassword: Boolean(fan.password),
      hasGoogle: Boolean(fan.googleId),
      emailVerifiedAt: fan.emailVerifiedAt,
      lastLogin: fan.lastLogin,
    };
  }

  private async findFanByLoginIdentifier(raw: string): Promise<Fan | null> {
    const phone = normalizeKenyaMsisdn(raw);
    if (phone) {
      return this.prisma.fan.findUnique({ where: { phone } });
    }
    const email = raw.toLowerCase();
    return this.prisma.fan.findUnique({ where: { email } });
  }

  private async issueToken(fan: Fan) {
    if (fan.phone) {
      await this.claimGuestSupportRecords(fan);
    }
    const accessToken = this.jwtService.sign({
      sub: fan.id,
      phone: fan.phone,
      email: fan.email,
      kind: 'fan',
    });
    return {
      accessToken,
      fan: await this.serializeFan(fan),
    };
  }

  requirePhone(raw: string): string {
    const phone = normalizeKenyaMsisdn(raw);
    if (!phone) {
      throw new BadRequestException('Enter a valid Kenyan mobile number');
    }
    return phone;
  }

  private hashOtp(phone: string, code: string): string {
    return createHash('sha256').update(`${phone}:${code}`).digest('hex');
  }

  private isDev(): boolean {
    return this.config.get<string>('NODE_ENV') !== 'production';
  }

  private assertEmailOtpResendAllowed(sentAt: Date | null | undefined) {
    if (emailOtpTooSoon(sentAt)) {
      throw new BadRequestException('Wait a moment before requesting another code');
    }
  }

  private queueVerificationEmail(toEmail: string, code: string, toName: string) {
    this.outboundMail.sendInBackground(
      emailOtpMail({
        toEmail,
        toName,
        code,
        role: 'fan',
      }),
    );
  }
}
