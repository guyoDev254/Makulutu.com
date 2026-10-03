import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { FanJwtAuthGuard } from '../fan-auth/guards/fan-jwt-auth.guard';
import { FanPortalService } from './fan-portal.service';
import { FanSubscribeDto } from './dto/fan-subscribe.dto';
import { FanShoutoutDto } from './dto/fan-shoutout.dto';
import { FanRewardCheckoutDto } from './dto/fan-reward-checkout.dto';
import { FanCoachDto } from './dto/fan-coach.dto';

@Controller('fan-portal')
@UseGuards(FanJwtAuthGuard)
export class FanPortalController {
  constructor(private readonly fanPortal: FanPortalService) {}

  @Get('me')
  me(@Request() req: { user: { sub: string } }) {
    return this.fanPortal.me(req.user.sub);
  }

  @Get('memberships')
  memberships(@Request() req: { user: { sub: string } }) {
    return this.fanPortal.memberships(req.user.sub);
  }

  @Get('payments')
  payments(@Request() req: { user: { sub: string } }) {
    return this.fanPortal.payments(req.user.sub);
  }

  @Get('payments/:id')
  paymentReceipt(
    @Request() req: { user: { sub: string } },
    @Param('id') id: string,
  ) {
    return this.fanPortal.paymentReceipt(req.user.sub, id);
  }

  @Get('follows')
  follows(@Request() req: { user: { sub: string } }) {
    return this.fanPortal.follows(req.user.sub);
  }

  @Post('follows/:slug')
  follow(
    @Request() req: { user: { sub: string } },
    @Param('slug') slug: string,
  ) {
    return this.fanPortal.follow(req.user.sub, slug);
  }

  @Delete('follows/:slug')
  unfollow(
    @Request() req: { user: { sub: string } },
    @Param('slug') slug: string,
  ) {
    return this.fanPortal.unfollow(req.user.sub, slug);
  }

  @Get('notifications')
  notifications(@Request() req: { user: { sub: string } }) {
    return this.fanPortal.notifications(req.user.sub);
  }

  @Patch('notifications/read')
  markNotificationsRead(@Request() req: { user: { sub: string } }) {
    return this.fanPortal.markNotificationsRead(req.user.sub);
  }

  @Patch('notifications/:id/read')
  markNotificationRead(
    @Request() req: { user: { sub: string } },
    @Param('id') id: string,
  ) {
    return this.fanPortal.markNotificationRead(req.user.sub, id);
  }

  @Get('coaching')
  coaching(@Request() req: { user: { sub: string } }) {
    return this.fanPortal.coachingInbox(req.user.sub);
  }

  @Get('creators/:slug')
  creatorSnapshot(
    @Request() req: { user: { sub: string } },
    @Param('slug') slug: string,
  ) {
    return this.fanPortal.creatorSnapshot(req.user.sub, slug);
  }

  @Post('subscribe')
  subscribe(
    @Request() req: { user: { sub: string } },
    @Body() dto: FanSubscribeDto,
  ) {
    return this.fanPortal.subscribe(req.user.sub, dto);
  }

  @Post('shoutout')
  async shoutout(
    @Request() req: { user: { sub: string } },
    @Body() dto: FanShoutoutDto,
  ) {
    const result = await this.fanPortal.shoutout(req.user.sub, dto);
    if (result.payment?.id) {
      await this.fanPortal.linkCheckoutUser(req.user.sub, result.payment.id);
    }
    return result;
  }

  @Post('rewards/:id/checkout')
  async checkoutReward(
    @Request() req: { user: { sub: string } },
    @Param('id') id: string,
    @Body() dto: FanRewardCheckoutDto,
  ) {
    const result = await this.fanPortal.checkoutReward(req.user.sub, id, dto);
    if (result.payment?.id) {
      await this.fanPortal.linkCheckoutUser(req.user.sub, result.payment.id);
    }
    return result;
  }

  @Post('coaching')
  checkoutCoaching(
    @Request() req: { user: { sub: string } },
    @Body() dto: FanCoachDto,
  ) {
    return this.fanPortal.checkoutCoaching(req.user.sub, dto);
  }
}
