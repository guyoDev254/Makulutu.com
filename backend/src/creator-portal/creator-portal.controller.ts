import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CreatorJwtAuthGuard } from '../creator-auth/guards/creator-jwt-auth.guard';
import { AdminService } from '../admin/admin.service';
import { UpdateSettingsDto } from '../admin/dto/update-settings.dto';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { AdminPaymentsQueryDto } from '../admin/dto/admin-payments-query.dto';
import { AdminStreamShoutoutsQueryDto } from '../admin/dto/admin-stream-shoutouts-query.dto';
import { AdminRevenueQueryDto } from '../admin/dto/admin-revenue-query.dto';
import { CreateCreatorRewardDto } from '../creator-reward/dto/create-creator-reward.dto';
import { UpdateCreatorRewardDto } from '../creator-reward/dto/update-creator-reward.dto';
import { CreateObsStreamLinkDto } from '../admin/dto/create-obs-stream-link.dto';
import { TestObsAlertDto } from '../admin/dto/test-obs-alert.dto';
import { CreatePayoutRequestDto } from './dto/create-payout-request.dto';

@Controller('creator-portal')
@UseGuards(CreatorJwtAuthGuard)
export class CreatorPortalController {
  constructor(
    private readonly adminService: AdminService,
    private readonly prisma: PrismaService,
  ) {}

  private cid(req: { user: { sub: string } }) {
    return req.user.sub;
  }

  @Get('dashboard')
  getDashboard(@Request() req: { user: { sub: string } }) {
    return this.adminService.getDashboardStats(this.cid(req));
  }

  @Get('settings')
  getSettings(@Request() req: { user: { sub: string } }) {
    return this.adminService.getSettings(this.cid(req));
  }

  @Put('settings')
  updateSettings(
    @Request() req: { user: { sub: string } },
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.adminService.updateSettings(dto, this.cid(req));
  }

  @Get('users')
  getUsers(
    @Request() req: { user: { sub: string } },
    @Query() pagination: PaginationDto,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllUsers(pagination, search, this.cid(req));
  }

  @Get('subscriptions')
  getSubscriptions(
    @Request() req: { user: { sub: string } },
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllSubscriptions(
      pagination,
      status,
      search,
      this.cid(req),
    );
  }

  @Get('payments')
  getPayments(
    @Request() req: { user: { sub: string } },
    @Query() query: AdminPaymentsQueryDto,
  ) {
    return this.adminService.getAllPayments(
      query,
      query.status,
      query.search,
      query.purpose,
      query.alertEmitted === true,
      query.rewardId,
      this.cid(req),
    );
  }

  @Get('payments/:id')
  async getPaymentById(
    @Request() req: { user: { sub: string } },
    @Param('id') id: string,
  ) {
    const payment = await this.adminService.getPaymentById(id, this.cid(req));
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  @Post('payments/:id/replay-obs-alert')
  @HttpCode(200)
  async replayPaymentObs(
    @Request() req: { user: { sub: string } },
    @Param('id') id: string,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      select: { creatorId: true },
    });
    if (!payment || payment.creatorId !== this.cid(req)) {
      throw new ForbiddenException();
    }
    return this.adminService.replayPaymentObsAlert(id);
  }

  @Get('stream-shoutouts')
  getStreamShoutouts(
    @Request() req: { user: { sub: string } },
    @Query() query: AdminStreamShoutoutsQueryDto,
  ) {
    return this.adminService.getStreamShoutouts(
      query,
      query.search,
      query.status,
      this.cid(req),
    );
  }

  @Post('stream-shoutouts/:id/replay')
  @HttpCode(200)
  async replayStreamShoutout(
    @Request() req: { user: { sub: string } },
    @Param('id') id: string,
  ) {
    const row = await this.prisma.streamShoutout.findUnique({
      where: { id },
      include: { payment: true },
    });
    if (!row?.payment || row.payment.creatorId !== this.cid(req)) {
      throw new ForbiddenException();
    }
    return this.adminService.replayStreamShoutoutObsAlert(id);
  }

  @Get('revenue')
  getRevenue(
    @Request() req: { user: { sub: string } },
    @Query() query: AdminRevenueQueryDto,
  ) {
    return this.adminService.getRevenueBreakdown(query, this.cid(req));
  }

  @Get('wallet-summary')
  getWalletSummary(@Request() req: { user: { sub: string } }) {
    return this.adminService.getCreatorWalletSummary(this.cid(req));
  }

  @Get('rankings')
  getSupporterRankings(
    @Request() req: { user: { sub: string } },
    @Query('limit') limit?: string,
  ) {
    const n = limit !== undefined ? Number.parseInt(limit, 10) : 25;
    return this.adminService.getCreatorSupporterRankings(this.cid(req), n);
  }

  @Get('payout-requests')
  getPayoutRequests(@Request() req: { user: { sub: string } }) {
    return this.adminService.getCreatorPayoutRequests(this.cid(req));
  }

  @Post('payout-requests')
  createPayoutRequest(
    @Request() req: { user: { sub: string } },
    @Body() body: CreatePayoutRequestDto,
  ) {
    return this.adminService.createCreatorPayoutRequest(this.cid(req), body);
  }

  @Get('creator-rewards')
  getCreatorRewards(@Request() req: { user: { sub: string } }) {
    return this.adminService.getCreatorRewardsAdmin(this.cid(req));
  }

  @Post('creator-rewards')
  createCreatorReward(
    @Request() req: { user: { sub: string } },
    @Body() dto: CreateCreatorRewardDto,
  ) {
    return this.adminService.createCreatorReward(dto, this.cid(req));
  }

  @Patch('creator-rewards/:id')
  updateCreatorReward(
    @Request() req: { user: { sub: string } },
    @Param('id') id: string,
    @Body() dto: UpdateCreatorRewardDto,
  ) {
    return this.adminService.updateCreatorReward(id, dto, this.cid(req));
  }

  @Get('obs-alerts/link')
  getObsPlayerLink(@Request() req: { user: { sub: string } }) {
    return this.adminService.getObsPlayerLinkForCreator(this.cid(req));
  }

  @Post('obs-stream-links')
  createObsStreamLink(
    @Request() req: { user: { sub: string } },
    @Body() body: CreateObsStreamLinkDto,
  ) {
    return this.adminService.createObsStreamLink(body, this.cid(req));
  }

  @Delete('obs-stream-links/:id')
  revokeObsStreamLink(
    @Request() req: { user: { sub: string } },
    @Param('id') id: string,
  ) {
    return this.adminService.revokeObsStreamLink(id, this.cid(req));
  }

  @Post('obs-alerts/test')
  testObsAlert(
    @Request() req: { user: { sub: string } },
    @Body() body: TestObsAlertDto,
  ) {
    return this.adminService.testObsAlert(
      body.tiktokUsername,
      body.kind ?? 'new',
      body.languageCode,
      body.skipGemini === true,
      body.announcementText,
      body.subscriberPlatform,
      body.subscriptionAmountKes,
      body.shoutoutAmountKes,
      body.videoUrl,
      body.coachingAccountUsername,
      body.creatorRewardId,
      this.cid(req),
    );
  }
}
