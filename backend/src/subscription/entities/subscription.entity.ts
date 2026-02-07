import { Subscription as PrismaSubscription, SubscriptionStatus, User } from '@prisma/client';

// Re-export SubscriptionStatus enum from Prisma
export { SubscriptionStatus };

// Subscription entity type (can include relations)
export type Subscription = PrismaSubscription & {
  user?: User;
};
