import { User as PrismaUser, Subscription, Payment } from '@prisma/client';

// User entity type (can include relations)
export type User = PrismaUser & {
  subscriptions?: Subscription[];
  payments?: Payment[];
};
