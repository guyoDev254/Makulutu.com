import { Payment as PrismaPayment, PaymentStatus, User } from '@prisma/client';

// Re-export PaymentStatus enum from Prisma
export { PaymentStatus };

// Payment entity type (can include relations)
export type Payment = PrismaPayment & {
  user?: User;
};
