-- CreateTable
CREATE TABLE "fans" (
    "id" TEXT NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(190),
    "password" TEXT,
    "name" VARCHAR(80),
    "tiktok_username" VARCHAR(64),
    "otp_hash" VARCHAR(128),
    "otp_expires_at" TIMESTAMP(3),
    "otp_sent_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fans_phone_key" ON "fans"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "fans_email_key" ON "fans"("email");

-- AlterTable
ALTER TABLE "users" ADD COLUMN "fan_id" TEXT;

-- Drop unique constraint first (Postgres will not DROP INDEX while the constraint exists)
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_tiktok_username_key";
DROP INDEX IF EXISTS "users_tiktok_username_key";

-- CreateIndex
CREATE UNIQUE INDEX "users_tiktok_username_creator_id_key" ON "users"("tiktok_username", "creator_id");

-- CreateIndex
CREATE INDEX "users_fan_id_idx" ON "users"("fan_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_fan_id_fkey" FOREIGN KEY ("fan_id") REFERENCES "fans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
