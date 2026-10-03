import { Body, Controller, Delete, Get, Patch, Post, Request, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request as ExpressRequest } from 'express';
import { FanAuthService } from './fan-auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginFanDto } from './dto/login-fan.dto';
import { SignupFanDto } from './dto/signup-fan.dto';
import { VerifyEmailOtpDto } from './dto/verify-email-otp.dto';
import { ResendVerificationEmailDto } from './dto/resend-verification-email.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { SetFanPasswordDto } from './dto/set-fan-password.dto';
import { UpdateFanProfileDto } from './dto/update-fan-profile.dto';
import { FanJwtAuthGuard } from './guards/fan-jwt-auth.guard';

@Controller('fan-auth')
export class FanAuthController {
  constructor(private readonly fanAuthService: FanAuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupFanDto) {
    return this.fanAuthService.signupWithEmail(dto);
  }

  @Post('verify-email-otp')
  verifyEmailOtp(@Body() dto: VerifyEmailOtpDto) {
    return this.fanAuthService.verifyEmailOtp(dto.email, dto.code);
  }

  @Post('resend-verification')
  resendVerification(@Body() dto: ResendVerificationEmailDto) {
    return this.fanAuthService.resendVerificationEmail(dto.email);
  }

  @Post('request-otp')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.fanAuthService.requestOtp(dto);
  }

  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.fanAuthService.verifyOtp(dto);
  }

  @Post('login')
  login(@Body() dto: LoginFanDto) {
    return this.fanAuthService.loginWithPassword(dto);
  }

  @Post('google')
  google(@Body() dto: GoogleAuthDto) {
    return this.fanAuthService.loginWithGoogle(dto.idToken, dto.dateOfBirth);
  }

  @Get('me')
  @UseGuards(FanJwtAuthGuard)
  me(@Request() req: { user: { sub: string } }) {
    return this.fanAuthService.me(req.user.sub);
  }

  @Patch('profile')
  @UseGuards(FanJwtAuthGuard)
  updateProfile(
    @Request() req: { user: { sub: string } },
    @Body() dto: UpdateFanProfileDto,
  ) {
    return this.fanAuthService.updateProfile(req.user.sub, dto);
  }

  @Post('set-password')
  @UseGuards(FanJwtAuthGuard)
  setPassword(
    @Request() req: { user: { sub: string } },
    @Body() dto: SetFanPasswordDto,
  ) {
    return this.fanAuthService.setPassword(req.user.sub, dto.password);
  }

  @Post('avatar')
  @UseGuards(FanJwtAuthGuard)
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
    const origin = host
      ? `${proto}://${host}`
      : `http://localhost:${process.env.PORT || '2000'}`;
    return this.fanAuthService.uploadAvatar(req.user.sub, file, origin);
  }

  @Delete('avatar')
  @UseGuards(FanJwtAuthGuard)
  clearAvatar(@Request() req: { user: { sub: string } }) {
    return this.fanAuthService.clearAvatar(req.user.sub);
  }
}
