import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CreatorAuthService } from './creator-auth.service';
import { LoginCreatorDto } from './dto/login-creator.dto';
import { SignupCreatorDto } from './dto/signup-creator.dto';
import { UpdateCreatorProfileDto } from './dto/update-creator-profile.dto';
import { ResendVerificationEmailDto } from './dto/resend-verification-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
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

  @Get('verify-email')
  verifyEmail(@Query('token') token?: string) {
    return this.creatorAuthService.verifyEmail(token);
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
}
