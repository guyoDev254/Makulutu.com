import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request as ExpressRequest } from 'express';
import { CreatorAuthService } from './creator-auth.service';
import { LoginCreatorDto } from './dto/login-creator.dto';
import { SignupCreatorDto } from './dto/signup-creator.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { UpdateCreatorProfileDto } from './dto/update-creator-profile.dto';
import { ResendVerificationEmailDto } from './dto/resend-verification-email.dto';
import { VerifyEmailOtpDto } from './dto/verify-email-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PresignCreatorMediaDto, ConfirmCreatorMediaDto } from './dto/presign-creator-media.dto';
import { CreatorJwtAuthGuard } from './guards/creator-jwt-auth.guard';

@Controller('creator-auth')
export class CreatorAuthController {
  constructor(private readonly creatorAuthService: CreatorAuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupCreatorDto) {
    return this.creatorAuthService.signup(dto);
  }

  @Post('login')
  login(@Body() dto: LoginCreatorDto) {
    return this.creatorAuthService.login(dto);
  }

  @Post('google')
  google(@Body() dto: GoogleAuthDto) {
    return this.creatorAuthService.loginWithGoogle(dto.idToken, dto.dateOfBirth);
  }

  @Get('verify-email')
  verifyEmail(@Query('token') token?: string) {
    return this.creatorAuthService.verifyEmail(token);
  }

  @Post('verify-email-otp')
  verifyEmailOtp(@Body() dto: VerifyEmailOtpDto) {
    return this.creatorAuthService.verifyEmailOtp(dto.email, dto.code);
  }

  @Post('resend-verification')
  resendVerification(@Body() dto: ResendVerificationEmailDto) {
    return this.creatorAuthService.resendVerificationEmail(dto.email);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.creatorAuthService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.creatorAuthService.resetPassword(dto.token, dto.password);
  }

  @Get('public')
  publicCreators() {
    return this.creatorAuthService.listPublicCreators();
  }

  /** Single public profile by URL slug (same visibility rules as the directory list). */
  @Get('public/:slug')
  async publicCreatorBySlug(@Param('slug') slug: string) {
    const row = await this.creatorAuthService.getPublicCreatorBySlug(slug);
    if (!row) {
      throw new NotFoundException('Creator not found');
    }
    return row;
  }

  @Get('me')
  @UseGuards(CreatorJwtAuthGuard)
  me(@Request() req: { user: { sub: string } }) {
    return this.creatorAuthService.me(req.user.sub);
  }

  @Patch('profile')
  @UseGuards(CreatorJwtAuthGuard)
  updateProfile(
    @Request() req: { user: { sub: string } },
    @Body() dto: UpdateCreatorProfileDto,
  ) {
    return this.creatorAuthService.updateProfile(req.user.sub, dto);
  }

  @Post('media/:slot/presign')
  @UseGuards(CreatorJwtAuthGuard)
  presignMedia(
    @Request() req: { user: { sub: string } },
    @Param('slot') slot: string,
    @Body() dto: PresignCreatorMediaDto,
  ) {
    return this.creatorAuthService.presignMedia(req.user.sub, slot, dto.contentType);
  }

  @Post('media/:slot/confirm')
  @UseGuards(CreatorJwtAuthGuard)
  confirmMedia(
    @Request() req: { user: { sub: string } },
    @Param('slot') slot: string,
    @Body() dto: ConfirmCreatorMediaDto,
  ) {
    return this.creatorAuthService.confirmMedia(req.user.sub, slot, dto.key);
  }

  @Post('media/:slot')
  @UseGuards(CreatorJwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 4 * 1024 * 1024 },
    }),
  )
  uploadMedia(
    @Request() req: ExpressRequest & { user: { sub: string } },
    @Param('slot') slot: string,
    @UploadedFile() file?: { buffer?: Buffer; mimetype?: string },
  ) {
    return this.creatorAuthService.uploadMedia(
      req.user.sub,
      slot,
      file,
      requestOrigin(req),
    );
  }

  @Delete('media/:slot')
  @UseGuards(CreatorJwtAuthGuard)
  clearMedia(
    @Request() req: { user: { sub: string } },
    @Param('slot') slot: string,
  ) {
    return this.creatorAuthService.clearMedia(req.user.sub, slot);
  }

  @Post('avatar')
  @UseGuards(CreatorJwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 4 * 1024 * 1024 },
    }),
  )
  uploadAvatar(
    @Request() req: ExpressRequest & { user: { sub: string } },
    @UploadedFile() file?: { buffer?: Buffer; mimetype?: string },
  ) {
    return this.creatorAuthService.uploadAvatar(
      req.user.sub,
      file,
      requestOrigin(req),
    );
  }

  @Delete('avatar')
  @UseGuards(CreatorJwtAuthGuard)
  clearAvatar(@Request() req: { user: { sub: string } }) {
    return this.creatorAuthService.clearAvatar(req.user.sub);
  }
}

function requestOrigin(req: ExpressRequest): string {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = (
    Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto || req.protocol || 'http'
  )
    .split(',')[0]
    .trim();
  const forwardedHost = req.headers['x-forwarded-host'];
  const host = (
    Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost || req.get('host') || ''
  )
    .split(',')[0]
    .trim();
  if (host) return `${proto}://${host}`;
  const port = process.env.PORT || '2000';
  return `http://localhost:${port}`;
}
