import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  Logger,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { RenewSubscriptionDto } from './dto/renew-subscription.dto';
import { RegisterSubscriptionDto } from './dto/register-subscription.dto';
import { PaymentService } from '../payment/payment.service';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { resolveDefaultCreatorId } from '../common/utils/default-creator';
import {
  fetchCreatorWorkspacePatch,
  mergeWorkspaceMonthlyPrice,
} from '../common/utils/creator-workspace-settings';

@Controller('subscriptions')
export class SubscriptionController {
  private readonly logger = new Logger(SubscriptionController.name);

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly paymentService: PaymentService,
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
  ) {}

  /** Public: membership, live shoutout, and custom reward tiers in display order. */
  @Get('support-catalog')
  getSupportCatalog(@Query('creatorSlug') creatorSlug?: string) {
    return this.paymentService.getPublicSupportCatalog(creatorSlug);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterSubscriptionDto) {
    let defaultCreatorId = await resolveDefaultCreatorId(this.prisma);
    const creatorSlug = registerDto.creatorSlug?.trim().toLowerCase();
    if (creatorSlug) {
      const creator = await this.prisma.creator.findFirst({
        where: {
          slug: { equals: creatorSlug, mode: 'insensitive' },
          isActive: true,
          onboardingComplete: true,
          supportEnabled: true,
        },
        select: { id: true },
      });
      if (creator) defaultCreatorId = creator.id;
    }

    // Check if user already exists
    let user = await this.userService.findByTikTokUsername(
      registerDto.tiktokUsername,
    );

    if (!user) {
      // Create new user
      user = await this.userService.create({
        name: registerDto.name,
        tiktokUsername: registerDto.tiktokUsername,
        mpesaMobile: registerDto.mpesaMobile,
        whatsappNumber: registerDto.whatsappNumber,
        ...(defaultCreatorId ? { creatorId: defaultCreatorId } : {}),
      });
    } else {
      // User exists - update phone numbers if they're different
      // This ensures STK Push goes to the correct phone number
      const needsUpdate =
        user.mpesaMobile !== registerDto.mpesaMobile ||
        user.whatsappNumber !== registerDto.whatsappNumber ||
        user.name !== registerDto.name;

      const needsCreator =
        !user.creatorId && defaultCreatorId;

      if (needsUpdate || needsCreator) {
        this.logger.log(
          `Updating user ${user.tiktokUsername} phone numbers: M-Pesa ${user.mpesaMobile} -> ${registerDto.mpesaMobile}, WhatsApp ${user.whatsappNumber} -> ${registerDto.whatsappNumber}`,
        );
        user = await this.userService.update(user.id, {
          name: registerDto.name,
          mpesaMobile: registerDto.mpesaMobile,
          whatsappNumber: registerDto.whatsappNumber,
          ...(needsCreator && defaultCreatorId
            ? { creatorId: defaultCreatorId }
            : {}),
        });
      }
    }

    // Get default monthly price from settings, fallback to 1 KES
    let monthlyPrice = registerDto.monthlyPrice;
    if (!monthlyPrice) {
      const settings = await this.prisma.settings.findUnique({
        where: { key: 'default_monthly_price' },
      });
      monthlyPrice = settings ? parseFloat(settings.value) : 1; // Default 1 KES per month
    }
    const amount = monthlyPrice * registerDto.months;
    const payMethod = (registerDto.paymentMethod || 'mpesa').toLowerCase();

    if (payMethod === 'paypal') {
      const { payment, approvalUrl } =
        await this.paymentService.createSubscriptionPayPalCheckout({
          userId: user.id,
          creatorId: defaultCreatorId ?? undefined,
          amount,
          months: registerDto.months,
          reference: `SUB_${user.id}_${Date.now()}`,
        });
      return {
        user,
        payment,
        approvalUrl,
        message: 'Continue to PayPal to complete payment.',
      };
    }

    const payment = await this.paymentService.create({
      userId: user.id,
      creatorId: defaultCreatorId ?? undefined,
      amount,
      months: registerDto.months,
      reference: `SUB_${user.id}_${Date.now()}`,
    });

    return {
      user,
      payment,
      message: 'STK Push initiated. Please complete payment on your phone.',
    };
  }

  @Post()
  create(@Body() createSubscriptionDto: CreateSubscriptionDto) {
    return this.subscriptionService.create(
      createSubscriptionDto.user,
      createSubscriptionDto.months,
      createSubscriptionDto.amount,
      createSubscriptionDto.paymentId,
    );
  }

  @Get()
  findAll() {
    return this.subscriptionService.findAll();
  }

  @Get('stats')
  getStats() {
    return this.subscriptionService.getStats();
  }

  @Get('price')
  async getMonthlyPrice(@Query('creatorSlug') creatorSlug?: string) {
    const settings = await this.prisma.settings.findUnique({
      where: { key: 'default_monthly_price' },
    });
    const parsed = settings ? parseFloat(settings.value) : 1;
    let monthlyPrice =
      Number.isFinite(parsed) && parsed >= 1 ? Math.round(parsed) : 1;

    const slug = creatorSlug?.trim().toLowerCase();
    if (slug) {
      const creator = await this.prisma.creator.findFirst({
        where: {
          slug: { equals: slug, mode: 'insensitive' },
          isActive: true,
        },
        select: { id: true },
      });
      if (creator) {
        const patch = await fetchCreatorWorkspacePatch(
          this.prisma,
          creator.id,
        );
        monthlyPrice = mergeWorkspaceMonthlyPrice(monthlyPrice, patch);
      }
    }

    return { monthlyPrice };
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.subscriptionService.findByUser(userId);
  }

  @Get('user/:userId/active')
  findActiveByUser(@Param('userId') userId: string) {
    return this.subscriptionService.findActiveByUser(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subscriptionService.findOne(id);
  }

  @Patch(':id/renew')
  renew(
    @Param('id') id: string,
    @Body() renewDto: RenewSubscriptionDto,
  ) {
    return this.subscriptionService.renew(
      id,
      renewDto.months,
      renewDto.amount,
      renewDto.paymentId,
    );
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.subscriptionService.cancel(id);
  }
}
