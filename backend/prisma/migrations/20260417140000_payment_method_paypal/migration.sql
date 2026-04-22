-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MPESA', 'PAYPAL');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "payment_method" "PaymentMethod" NOT NULL DEFAULT 'MPESA';
ALTER TABLE "payments" ADD COLUMN "paypal_order_id" TEXT;

CREATE INDEX "payments_paypal_order_id_idx" ON "payments"("paypal_order_id");
