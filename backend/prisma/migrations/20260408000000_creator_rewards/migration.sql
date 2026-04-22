-- Custom Patreon-style rewards (fixed-price M-Pesa checkouts + OBS alert config)

CREATE TABLE "creator_rewards" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "amount_kes" DECIMAL(10,2) NOT NULL,
    "alert_banner_label" VARCHAR(40) NOT NULL,
    "tts_script" VARCHAR(600),
    "allow_supporter_message" BOOLEAN NOT NULL DEFAULT true,
    "allow_video_clip" BOOLEAN NOT NULL DEFAULT false,
    "max_message_length" INTEGER NOT NULL DEFAULT 200,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_rewards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "creator_reward_purchases" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "reward_id" TEXT NOT NULL,
    "reward_name_snapshot" VARCHAR(80) NOT NULL,
    "banner_label_snapshot" VARCHAR(40) NOT NULL,
    "tts_script_snapshot" VARCHAR(600),
    "display_name" VARCHAR(64) NOT NULL,
    "platform" VARCHAR(32) NOT NULL DEFAULT 'tiktok',
    "supporter_message" VARCHAR(500),
    "video_url" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_reward_purchases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "creator_reward_purchases_payment_id_key" ON "creator_reward_purchases"("payment_id");
CREATE INDEX "creator_reward_purchases_reward_id_idx" ON "creator_reward_purchases"("reward_id");

ALTER TYPE "PaymentPurpose" ADD VALUE 'CREATOR_REWARD';

ALTER TABLE "creator_reward_purchases" ADD CONSTRAINT "creator_reward_purchases_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "creator_reward_purchases" ADD CONSTRAINT "creator_reward_purchases_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "creator_rewards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
