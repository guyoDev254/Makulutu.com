import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private subscriptionService: SubscriptionService) {}

  /**
   * Check and expire subscriptions daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredSubscriptions() {
    this.logger.log('Checking for expired subscriptions...');
    await this.subscriptionService.checkAndExpireSubscriptions();
    this.logger.log('Expired subscriptions check completed');
  }
}
