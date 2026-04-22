-- AlterEnum
ALTER TYPE "PaymentPurpose" ADD VALUE 'COACHING_BOOKING';

-- AlterTable
ALTER TABLE "coaching_bookings" ADD COLUMN "account_username" VARCHAR(120);
ALTER TABLE "coaching_bookings" ADD COLUMN "payment_id" TEXT;

CREATE INDEX "coaching_bookings_payment_id_idx" ON "coaching_bookings"("payment_id");

ALTER TABLE "coaching_bookings" ADD CONSTRAINT "coaching_bookings_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
