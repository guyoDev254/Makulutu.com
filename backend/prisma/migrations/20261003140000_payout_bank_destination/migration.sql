-- AlterTable
ALTER TABLE "creator_payout_destinations" ALTER COLUMN "msisdn" DROP NOT NULL;

-- AlterTable
ALTER TABLE "creator_payout_destinations" ADD COLUMN IF NOT EXISTS "bank_code" VARCHAR(32);
ALTER TABLE "creator_payout_destinations" ADD COLUMN IF NOT EXISTS "bank_name" VARCHAR(80);
ALTER TABLE "creator_payout_destinations" ADD COLUMN IF NOT EXISTS "account_number" VARCHAR(32);
ALTER TABLE "creator_payout_destinations" ADD COLUMN IF NOT EXISTS "account_name" VARCHAR(80);
