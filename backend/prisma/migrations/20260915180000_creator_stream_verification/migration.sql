ALTER TABLE "creators" ADD COLUMN IF NOT EXISTS "stream_verified_at" TIMESTAMP(3);
ALTER TABLE "creators" ADD COLUMN IF NOT EXISTS "stream_links_submitted_at" TIMESTAMP(3);
ALTER TABLE "creators" ADD COLUMN IF NOT EXISTS "stream_review_note" TEXT;

-- Existing onboarded creators keep OBS access; new signups wait for admin review.
UPDATE "creators"
SET "stream_verified_at" = COALESCE("stream_verified_at", "created_at")
WHERE "onboarding_complete" = true AND "stream_verified_at" IS NULL;
