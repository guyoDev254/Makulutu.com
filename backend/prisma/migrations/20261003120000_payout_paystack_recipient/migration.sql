-- AlterTable
ALTER TABLE "creator_payout_destinations" ADD COLUMN IF NOT EXISTS "paystack_recipient_code" VARCHAR(64);
