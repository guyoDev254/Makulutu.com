import { Controller, Get, Query, UseGuards, Put, Body, Param, NotFoundException, Post, Patch } from '@nestjs/common';
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

const ALL_ROLES = ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'];
const ADMIN_ONLY = ['ADMIN', 'SUPER_ADMIN'];

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @Roles(...ALL_ROLES)
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  @Roles(...ALL_ROLES)
  getAllUsers(
    @Query() pagination: PaginationDto,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllUsers(pagination, search);
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

  @Get('payments')
  @Roles(...ALL_ROLES)
  getAllPayments(
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllPayments(pagination, status, search);
  }

  @Get('payments/:id')
  @Roles(...ALL_ROLES)
  async getPaymentById(@Param('id') id: string) {
    const pagination = new PaginationDto();
    pagination.page = 1;
    pagination.limit = 1000;
    const payments = await this.adminService.getAllPayments(pagination);
    const payment = payments.data.find((p) => p.id === id);
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
  updateSettings(@Body() updateDto: UpdateSettingsDto) {
    return this.adminService.updateSettings(updateDto);
  }
}
