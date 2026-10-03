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
import { UpdateUserDto } from '../admin/dto/update-user.dto';
import { UpdateSubscriptionDto } from '../admin/dto/update-subscription.dto';
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
import { ScheduledLivesService } from '../scheduled-lives/scheduled-lives.service';
import { CreateScheduledLiveDto } from '../scheduled-lives/dto/create-scheduled-live.dto';
import { UpdateScheduledLiveDto } from '../scheduled-lives/dto/update-scheduled-live.dto';
import { FinanceService } from '../finance/finance.service';
import { UpsertPayoutDestinationDto } from './dto/upsert-payout-destination.dto';

@Controller('creator-portal')
@UseGuards(CreatorJwtAuthGuard)
export class CreatorPortalController {
  constructor(
    private readonly adminService: AdminService,
    private readonly prisma: PrismaService,
    private readonly scheduledLives: ScheduledLivesService,
    private readonly finance: FinanceService,
  ) {}

  private cid(req: { user: { sub: string } }) {
    return req.user.sub;
  }

  @Get('dashboard')
  getDashboard(
    @Request() req: { user: { sub: string } },
    @Query() query: AdminRevenueQueryDto,
  ) {
    return this.adminService.getDashboardStats(this.cid(req), query);
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

  @Put('users/:id')
  updateUser(
    @Request() req: { user: { sub: string } },
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(id, dto, this.cid(req));
  }

  @Delete('users/:id')
  deleteUser(
    @Request() req: { user: { sub: string } },
    @Param('id') id: string,
  ) {
    return this.adminService.deleteUser(id, this.cid(req));
  }

  @Patch('users/:id/whatsapp-confirm')
  confirmWhatsAppAdded(
    @Request() req: { user: { sub: string } },
    @Param('id') id: string,
  ) {
    return this.adminService.confirmWhatsAppAdded(id, this.cid(req));
  }

  @Patch('users/:id/whatsapp-remove')
  markWhatsAppRemoved(
    @Request() req: { user: { sub: string } },
    @Param('id') id: string,
  ) {
    return this.adminService.markWhatsAppRemoved(id, this.cid(req));
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

  @Put('subscriptions/:id')
  updateSubscription(
    @Request() req: { user: { sub: string } },
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.adminService.updateSubscription(id, dto, this.cid(req));
  }

  @Delete('subscriptions/:id')
  deleteSubscription(
    @Request() req: { user: { sub: string } },
    @Param('id') id: string,
  ) {
    return this.adminService.deleteSubscription(id, this.cid(req));
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
    await this.adminService.ensureCreatorCanUseObs(this.cid(req));
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
    await this.adminService.ensureCreatorCanUseObs(this.cid(req));
    return this.adminService.replayStreamShoutoutObsAlert(id);
  }

  @Get('revenue')
  getRevenue(
    @Request() req: { user: { sub: string } },
    @Query() query: AdminRevenueQueryDto,
  ) {
    return this.adminService.getRevenueBreakdown(query, this.cid(req));
  }

  @Get('revenue/summary')
  getRevenueSummary(@Request() req: { user: { sub: string } }) {
    return this.finance.getCreatorSummary(this.cid(req));
  }

  @Get('revenue/transactions')
  getRevenueTransactions(
    @Request() req: { user: { sub: string } },
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.finance.getCreatorTransactions(this.cid(req), {
      from,
      to,
      type,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 25,
    });
  }

  @Get('revenue/withdrawals')
  getRevenueWithdrawals(@Request() req: { user: { sub: string } }) {
    return this.adminService.getCreatorPayoutRequests(this.cid(req));
  }

  @Get('payout-destination')
  getPayoutDestination(@Request() req: { user: { sub: string } }) {
    return this.finance.getPayoutDestination(this.cid(req));
  }

  @Put('payout-destination')
  upsertPayoutDestination(
    @Request() req: { user: { sub: string } },
    @Body() body: UpsertPayoutDestinationDto,
  ) {
    return this.finance.upsertPayoutDestination(this.cid(req), body);
  }

  @Get('payout-banks')
  listPayoutBanks() {
    return this.finance.listPayoutBanks();
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

  @Get('scheduled-lives')
  listScheduledLives(@Request() req: { user: { sub: string } }) {
    return this.scheduledLives.listForCreator(this.cid(req));
  }

  @Post('scheduled-lives')
  createScheduledLive(
    @Request() req: { user: { sub: string } },
    @Body() dto: CreateScheduledLiveDto,
  ) {
    return this.scheduledLives.create(this.cid(req), dto);
  }

  @Patch('scheduled-lives/:id')
  updateScheduledLive(
    @Request() req: { user: { sub: string } },
    @Param('id') id: string,
    @Body() dto: UpdateScheduledLiveDto,
  ) {
    return this.scheduledLives.update(this.cid(req), id, dto);
  }

  @Post('scheduled-lives/:id/go-live')
  @HttpCode(200)
  goLiveScheduledLive(
    @Request() req: { user: { sub: string } },
    @Param('id') id: string,
  ) {
    return this.scheduledLives.goLive(this.cid(req), id);
  }

  @Post('scheduled-lives/:id/end')
  @HttpCode(200)
  endScheduledLive(
    @Request() req: { user: { sub: string } },
    @Param('id') id: string,
  ) {
    return this.scheduledLives.end(this.cid(req), id);
  }

  @Post('scheduled-lives/:id/cancel')
  @HttpCode(200)
  cancelScheduledLive(
    @Request() req: { user: { sub: string } },
    @Param('id') id: string,
  ) {
    return this.scheduledLives.cancel(this.cid(req), id);
  }
}
