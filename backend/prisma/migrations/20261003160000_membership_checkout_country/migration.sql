ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "checkout_country" VARCHAR(8);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "checkout_country" VARCHAR(8);
