-- CreateEnum
CREATE TYPE "ScheduledLiveStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "scheduled_lives" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000),
    "platform" VARCHAR(32) NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "stream_url" VARCHAR(500),
    "status" "ScheduledLiveStatus" NOT NULL DEFAULT 'SCHEDULED',
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_lives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_lives_creator_id_starts_at_idx" ON "scheduled_lives"("creator_id", "starts_at");

-- CreateIndex
CREATE INDEX "scheduled_lives_status_starts_at_idx" ON "scheduled_lives"("status", "starts_at");

-- AddForeignKey
ALTER TABLE "scheduled_lives" ADD CONSTRAINT "scheduled_lives_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;
