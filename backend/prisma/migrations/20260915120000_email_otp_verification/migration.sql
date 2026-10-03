-- Fan email OTP (separate from WhatsApp phone OTP)
ALTER TABLE "fans" ADD COLUMN IF NOT EXISTS "email_otp_hash" VARCHAR(128);
ALTER TABLE "fans" ADD COLUMN IF NOT EXISTS "email_otp_expires_at" TIMESTAMP(3);
ALTER TABLE "fans" ADD COLUMN IF NOT EXISTS "email_otp_sent_at" TIMESTAMP(3);

-- Existing email accounts stay signed in; new signups must verify a 6-digit code.
UPDATE "fans"
SET "email_verified_at" = COALESCE("email_verified_at", "created_at")
WHERE "email" IS NOT NULL AND "email_verified_at" IS NULL;
