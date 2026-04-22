-- CreateTable
CREATE TABLE "stream_shoutouts" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "display_handle" VARCHAR(64) NOT NULL,
    "platform" VARCHAR(32) NOT NULL,
    "message" VARCHAR(500),
    "amount_kes" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stream_shoutouts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stream_shoutouts_payment_id_key" ON "stream_shoutouts"("payment_id");

ALTER TABLE "stream_shoutouts" ADD CONSTRAINT "stream_shoutouts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from legacy payment columns (STREAM_ALERT only)
INSERT INTO "stream_shoutouts" ("id", "payment_id", "display_handle", "platform", "message", "amount_kes", "created_at", "updated_at")
SELECT
  gen_random_uuid()::text,
  p."id",
  COALESCE(NULLIF(TRIM(p."stream_alert_handle"), ''), 'unknown'),
  COALESCE(NULLIF(TRIM(p."stream_alert_platform"), ''), 'tiktok'),
  p."stream_alert_message",
  COALESCE(p."amount", 0),
  COALESCE(p."created_at", CURRENT_TIMESTAMP),
  CURRENT_TIMESTAMP
FROM "payments" p
WHERE p."purpose" = 'STREAM_ALERT'
  AND NOT EXISTS (
    SELECT 1 FROM "stream_shoutouts" s WHERE s."payment_id" = p."id"
  );
