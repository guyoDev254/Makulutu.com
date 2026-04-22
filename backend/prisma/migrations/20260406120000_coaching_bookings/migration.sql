-- CreateEnum
CREATE TYPE "CoachingBookingService" AS ENUM ('ACCOUNT_REVIEW', 'RANK_PUSH', 'BOTH');

-- CreateEnum
CREATE TYPE "CoachingBookingStatus" AS ENUM ('PENDING', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "coaching_bookings" (
    "id" TEXT NOT NULL,
    "service" "CoachingBookingService" NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "contact" VARCHAR(120) NOT NULL,
    "availability" VARCHAR(500),
    "notes" TEXT,
    "status" "CoachingBookingStatus" NOT NULL DEFAULT 'PENDING',
    "admin_notes" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coaching_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coaching_bookings_status_created_at_idx" ON "coaching_bookings"("status", "created_at" DESC);
