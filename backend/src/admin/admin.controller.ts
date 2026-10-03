import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { CreateSubscriptionAdminDto } from './dto/create-subscription-admin.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { TestObsAlertDto } from './dto/test-obs-alert.dto';
import { CreateObsStreamLinkDto } from './dto/create-obs-stream-link.dto';
import { AdminPaymentsQueryDto } from './dto/admin-payments-query.dto';
import { AdminStreamShoutoutsQueryDto } from './dto/admin-stream-shoutouts-query.dto';
import { DeleteStreamShoutoutsDto } from './dto/delete-stream-shoutouts.dto';
import { UpdateCoachingBookingAdminDto } from './dto/update-coaching-booking-admin.dto';
import { AdminRevenueQueryDto } from './dto/admin-revenue-query.dto';
import { AdminRevenueTransactionsQueryDto, AdminRevenueChartQueryDto } from './dto/admin-revenue-transactions-query.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { AdminPayoutRequestsQueryDto } from './dto/admin-payout-requests-query.dto';
import { AdminPayoutExportQueryDto } from './dto/admin-payout-export-query.dto';
import { ReviewPayoutRequestDto } from './dto/review-payout-request.dto';
import { CreateCreatorRewardDto } from '../creator-reward/dto/create-creator-reward.dto';
import { UpdateCreatorRewardDto } from '../creator-reward/dto/update-creator-reward.dto';
import { UpdateCreatorAdminDto } from './dto/update-creator-admin.dto';
import { NotifyCreatorEmailDto } from './dto/notify-creator-email.dto';
import type { Response } from 'express';

const ALL_ROLES = ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'];
const ADMIN_ONLY = ['ADMIN', 'SUPER_ADMIN'];
const SUPER_ADMIN_ONLY = ['SUPER_ADMIN'];

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @Roles(...ALL_ROLES)
  getDashboard(@Query() query: AdminRevenueQueryDto) {
    return this.adminService.getDashboardStats(undefined, query);
  }

  @Get('users')
  @Roles(...ALL_ROLES)
  getAllUsers(
    @Query() pagination: PaginationDto,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllUsers(pagination, search);
  }

  /** Streamer / creator accounts (login + public page), not supporter users. */
  @Get('creators')
  @Roles(...ALL_ROLES)
  getAllCreators(
    @Query() pagination: PaginationDto,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllCreators(pagination, search);
  }

  @Patch('creators/:id')
  @Roles(...ADMIN_ONLY)
  updateCreatorAdmin(
    @Param('id') id: string,
    @Body() dto: UpdateCreatorAdminDto,
  ) {
    return this.adminService.updateCreatorAdmin(id, dto);
  }

  @Post('creators/:id/notify-email')
  @Roles(...SUPER_ADMIN_ONLY)
  notifyCreatorByEmail(
    @Req() req: { user?: { username?: string; role?: string } },
    @Param('id') id: string,
    @Body() dto: NotifyCreatorEmailDto,
  ) {
    const sender = req.user?.username || req.user?.role || 'Super admin';
    return this.adminService.notifyCreatorByEmail(id, dto, sender);
  }

  @Get('creators/:id/dashboard')
  @Roles(...ALL_ROLES)
  getCreatorDashboard(
    @Param('id') id: string,
    @Query() query: AdminRevenueQueryDto,
  ) {
    return this.adminService.getDashboardStats(id, query);
  }

  /** Full creator snapshot: related users, payments, payouts, OBS links, etc. (sensitive). */
  @Get('creators/:id/super-profile')
  @Roles(...SUPER_ADMIN_ONLY)
  getCreatorSuperAdminProfile(@Param('id') id: string) {
    return this.adminService.getCreatorSuperAdminProfile(id);
  }

  @Get('users/:id')
  @Roles(...ALL_ROLES)
  async getUserById(@Param('id') id: string) {
    const pagination = new PaginationDto();
    pagination.page = 1;
    pagination.limit = 1000;
    const users = await this.adminService.getAllUsers(pagination);
    const user = users.data.find((u) => u.id === id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @Put('users/:id')
  @Roles(...ADMIN_ONLY)
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return await this.adminService.updateUser(id, updateUserDto);
  }

  @Delete('users/:id')
  @Roles(...ADMIN_ONLY)
  async deleteUser(@Param('id') id: string) {
    return await this.adminService.deleteUser(id);
  }

  @Patch('users/:id/whatsapp-confirm')
  @Roles(...ALL_ROLES)
  async confirmWhatsAppAdded(@Param('id') id: string) {
    return await this.adminService.confirmWhatsAppAdded(id);
  }

  @Patch('users/:id/whatsapp-remove')
  @Roles(...ALL_ROLES)
  async markWhatsAppRemoved(@Param('id') id: string) {
    return await this.adminService.markWhatsAppRemoved(id);
  }

  @Get('subscriptions')
  @Roles(...ALL_ROLES)
  getAllSubscriptions(
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllSubscriptions(pagination, status, search);
  }

  @Get('subscriptions/:id')
  @Roles(...ALL_ROLES)
  async getSubscriptionById(@Param('id') id: string) {
    const pagination = new PaginationDto();
    pagination.page = 1;
    pagination.limit = 1000;
    const subscriptions = await this.adminService.getAllSubscriptions(pagination);
    const subscription = subscriptions.data.find((s) => s.id === id);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    return subscription;
  }

  @Put('subscriptions/:id')
  @Roles(...ADMIN_ONLY)
  async updateSubscription(
    @Param('id') id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    return await this.adminService.updateSubscription(id, updateSubscriptionDto);
  }

  @Delete('subscriptions/:id')
  @Roles(...ADMIN_ONLY)
  async deleteSubscription(@Param('id') id: string) {
    return await this.adminService.deleteSubscription(id);
  }

  @Get('payments')
  @Roles(...ALL_ROLES)
  getAllPayments(@Query() query: AdminPaymentsQueryDto) {
    return this.adminService.getAllPayments(
      query,
      query.status,
      query.search,
      query.purpose,
      query.alertEmitted === true,
      query.rewardId,
    );
  }

  /** Shoutout checkout copy stored in `stream_shoutouts` (not merged into user/subscription fields). */
  @Get('stream-shoutouts')
  @Roles(...ALL_ROLES)
  getStreamShoutouts(@Query() query: AdminStreamShoutoutsQueryDto) {
    return this.adminService.getStreamShoutouts(
      query,
      query.search,
      query.status,
    );
  }

  @Post('stream-shoutouts/delete')
  @HttpCode(200)
  @Roles(...ADMIN_ONLY)
  deleteStreamShoutouts(@Body() body: DeleteStreamShoutoutsDto) {
    return this.adminService.deleteStreamShoutouts(body.ids);
  }

  /** Re-send OBS shoutout overlay (SSE) for a completed checkout row. */
  @Post('stream-shoutouts/:id/replay')
  @HttpCode(200)
  @Roles(...ALL_ROLES)
  replayStreamShoutout(@Param('id') id: string) {
    return this.adminService.replayStreamShoutoutObsAlert(id);
  }

  /** Re-send OBS overlay for any completed payment tier (subscription, shoutout, reward, coaching). */
  @Post('payments/:id/replay-obs-alert')
  @HttpCode(200)
  @Roles(...ALL_ROLES)
  replayPaymentObsAlert(@Param('id') id: string) {
    return this.adminService.replayPaymentObsAlert(id);
  }

  @Post('payments/:id/refund')
  @HttpCode(200)
  @Roles(...ADMIN_ONLY)
  refundPayment(
    @Req() req: { user?: { username?: string; role?: string } },
    @Param('id') id: string,
    @Body() body: RefundPaymentDto,
  ) {
    const actor = req.user?.username || req.user?.role || 'admin';
    return this.adminService.refundPayment(id, body.reason, actor);
  }

  @Get('payments/:id')
  @Roles(...ALL_ROLES)
  async getPaymentById(@Param('id') id: string) {
    const payment = await this.adminService.getPaymentById(id);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  @Put('payments/:id')
  @Roles(...ADMIN_ONLY)
  async updatePayment(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
  ) {
    return await this.adminService.updatePayment(id, updatePaymentDto);
  }

  @Post('subscriptions/create')
  @Roles(...ADMIN_ONLY)
  async createSubscription(@Body() createDto: CreateSubscriptionAdminDto) {
    return await this.adminService.createSubscription(createDto);
  }

  @Get('settings')
  @Roles(...ADMIN_ONLY)
  getSettings() {
    return this.adminService.getSettings();
  }

  @Put('settings')
  @Roles(...ADMIN_ONLY)
  updateSettings(@Req() req: { user?: { role?: string } }, @Body() updateDto: UpdateSettingsDto) {
    if (
      (updateDto.platformFeePercent !== undefined ||
        updateDto.settlementPeriodHours !== undefined ||
        updateDto.minWithdrawalKes !== undefined ||
        updateDto.withdrawalFeeKes !== undefined) &&
      req.user?.role !== 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException(
        'Only Super Admin can update platform fee, settlement, or withdrawal settings',
      );
    }
    return this.adminService.updateSettings(updateDto);
  }

  /** Fire a test subscriber alert to connected OBS Browser Sources (SSE). */
  @Post('obs-alerts/test')
  @Roles(...ALL_ROLES)
  testObsAlert(@Body() body: TestObsAlertDto) {
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
    );
  }

  @Get('obs-alerts/link')
  @Roles(...ALL_ROLES)
  getObsPlayerLink() {
    return this.adminService.getObsPlayerLink();
  }

  @Post('obs-stream-links')
  @Roles(...ADMIN_ONLY)
  createObsStreamLink(@Body() body: CreateObsStreamLinkDto) {
    return this.adminService.createObsStreamLink(body);
  }

  @Delete('obs-stream-links/:id')
  @Roles(...ADMIN_ONLY)
  revokeObsStreamLink(@Param('id') id: string) {
    return this.adminService.revokeObsStreamLink(id);
  }

  @Get('revenue')
  @Roles(...ALL_ROLES)
  getRevenue(@Query() query: AdminRevenueQueryDto) {
    return this.adminService.getRevenueBreakdown(query);
  }

  @Get('revenue/summary')
  @Roles(...ALL_ROLES)
  getRevenueSummary(@Query() query: AdminRevenueQueryDto) {
    return this.adminService.getRevenueSummary(query);
  }

  @Get('revenue/transactions')
  @Roles(...ALL_ROLES)
  getRevenueTransactions(@Query() query: AdminRevenueTransactionsQueryDto) {
    return this.adminService.getRevenueTransactions(query);
  }

  @Get('revenue/chart')
  @Roles(...ALL_ROLES)
  getRevenueChart(@Query() query: AdminRevenueChartQueryDto) {
    return this.adminService.getRevenueChart(query);
  }

  @Get('settlements')
  @Roles(...ALL_ROLES)
  getSettlements(@Query() query: AdminRevenueTransactionsQueryDto) {
    return this.adminService.getPendingSettlements(query);
  }

  @Get('coaching-bookings')
  @Roles(...ALL_ROLES)
  getCoachingBookings(
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
  ) {
    return this.adminService.getCoachingBookings(pagination, status);
  }

  @Get('payout-requests')
  @Roles(...ALL_ROLES)
  getPayoutRequests(@Query() query: AdminPayoutRequestsQueryDto) {
    return this.adminService.listPayoutRequests(query);
  }

  @Get('payout-requests/export')
  @Roles(...ADMIN_ONLY)
  async exportPayoutRequests(
    @Query() query: AdminPayoutExportQueryDto,
    @Res() res: Response,
  ) {
    const { csv, filename } =
      await this.adminService.exportPayoutRequestsCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  }

  @Patch('payout-requests/:id')
  @Roles(...ADMIN_ONLY)
  reviewPayoutRequest(
    @Req() req: { user?: { username?: string; role?: string } },
    @Param('id') id: string,
    @Body() dto: ReviewPayoutRequestDto,
  ) {
    const reviewer = req.user?.username || req.user?.role || 'admin';
    return this.adminService.reviewPayoutRequest(id, dto, reviewer);
  }

  @Patch('coaching-bookings/:id')
  @Roles(...ALL_ROLES)
  updateCoachingBooking(
    @Param('id') id: string,
    @Body() dto: UpdateCoachingBookingAdminDto,
  ) {
    return this.adminService.updateCoachingBooking(id, dto);
  }

  @Get('creator-rewards')
  @Roles(...ALL_ROLES)
  getCreatorRewardsAdmin() {
    return this.adminService.getCreatorRewardsAdmin();
  }

  @Post('creator-rewards')
  @Roles(...ADMIN_ONLY)
  createCreatorReward(@Body() dto: CreateCreatorRewardDto) {
    return this.adminService.createCreatorReward(dto);
  }

  @Patch('creator-rewards/:id')
  @Roles(...ADMIN_ONLY)
  updateCreatorReward(
    @Param('id') id: string,
    @Body() dto: UpdateCreatorRewardDto,
  ) {
    return this.adminService.updateCreatorReward(id, dto);
  }
}
