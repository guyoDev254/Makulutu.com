-- Ledger, settlement snapshots, refunds, payout destinations, withdrawal fee fields.

ALTER TYPE "PayoutRequestStatus" ADD VALUE IF NOT EXISTS 'FAILED';
ALTER TYPE "PayoutRequestStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

DO $$ BEGIN
  CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'SETTLED', 'REFUNDED', 'ADJUSTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LedgerEntryType" AS ENUM (
    'PAYMENT_EARNING',
    'PLATFORM_FEE',
    'SETTLEMENT',
    'REFUND',
    'REFUND_REVERSAL',
    'WITHDRAWAL_RESERVATION',
    'WITHDRAWAL_COMPLETED',
    'WITHDRAWAL_FAILED',
    'WITHDRAWAL_FEE',
    'ADJUSTMENT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LedgerAccount" AS ENUM (
    'CREATOR_PENDING',
    'CREATOR_AVAILABLE',
    'CREATOR_RESERVED',
    'CREATOR_DEBT',
    'PLATFORM_REVENUE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "platform_fee_kes" DECIMAL(14, 2),
  ADD COLUMN IF NOT EXISTS "creator_amount_kes" DECIMAL(14, 2),
  ADD COLUMN IF NOT EXISTS "fee_percent_snapshot" DECIMAL(6, 2),
  ADD COLUMN IF NOT EXISTS "settlement_status" "SettlementStatus",
  ADD COLUMN IF NOT EXISTS "settle_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "settled_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "ledger_posted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "refunded_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "payments_settlement_status_settle_at_idx"
  ON "payments" ("settlement_status", "settle_at");

CREATE UNIQUE INDEX IF NOT EXISTS "payments_transaction_id_unique"
  ON "payments" ("transaction_id")
  WHERE "transaction_id" IS NOT NULL AND "transaction_id" <> '';

ALTER TABLE "payout_requests"
  ADD COLUMN IF NOT EXISTS "withdrawal_fee_kes" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "payout_amount_kes" DECIMAL(14, 2),
  ADD COLUMN IF NOT EXISTS "destination_id" TEXT,
  ADD COLUMN IF NOT EXISTS "processed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "failure_reason" VARCHAR(500);

CREATE UNIQUE INDEX IF NOT EXISTS "payout_requests_payout_reference_key"
  ON "payout_requests" ("payout_reference")
  WHERE "payout_reference" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "creator_payout_destinations" (
  "id" TEXT NOT NULL,
  "creator_id" TEXT NOT NULL,
  "channel" VARCHAR(32) NOT NULL DEFAULT 'MPESA',
  "msisdn" VARCHAR(20) NOT NULL,
  "last4" VARCHAR(4) NOT NULL,
  "verified_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "creator_payout_destinations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "creator_payout_destinations_creator_id_key"
  ON "creator_payout_destinations" ("creator_id");

CREATE TABLE IF NOT EXISTS "payment_refunds" (
  "id" TEXT NOT NULL,
  "payment_id" TEXT NOT NULL,
  "gross_amount_kes" DECIMAL(14, 2) NOT NULL,
  "platform_fee_kes" DECIMAL(14, 2) NOT NULL,
  "creator_amount_kes" DECIMAL(14, 2) NOT NULL,
  "reason" VARCHAR(500),
  "created_by" VARCHAR(120),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_refunds_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_refunds_payment_id_key" ON "payment_refunds" ("payment_id");

CREATE TABLE IF NOT EXISTS "ledger_entries" (
  "id" TEXT NOT NULL,
  "type" "LedgerEntryType" NOT NULL,
  "account" "LedgerAccount" NOT NULL,
  "amount_kes" DECIMAL(14, 2) NOT NULL,
  "currency" VARCHAR(8) NOT NULL DEFAULT 'KES',
  "creator_id" TEXT,
  "payment_id" TEXT,
  "payout_request_id" TEXT,
  "refund_id" TEXT,
  "related_entry_id" TEXT,
  "idempotency_key" VARCHAR(160) NOT NULL,
  "description" VARCHAR(280),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ledger_entries_idempotency_key_key"
  ON "ledger_entries" ("idempotency_key");
CREATE INDEX IF NOT EXISTS "ledger_entries_creator_id_account_created_at_idx"
  ON "ledger_entries" ("creator_id", "account", "created_at");
CREATE INDEX IF NOT EXISTS "ledger_entries_payment_id_type_idx"
  ON "ledger_entries" ("payment_id", "type");
CREATE INDEX IF NOT EXISTS "ledger_entries_payout_request_id_idx"
  ON "ledger_entries" ("payout_request_id");

DO $$ BEGIN
  ALTER TABLE "creator_payout_destinations"
    ADD CONSTRAINT "creator_payout_destinations_creator_id_fkey"
    FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "payment_refunds"
    ADD CONSTRAINT "payment_refunds_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ledger_entries"
    ADD CONSTRAINT "ledger_entries_creator_id_fkey"
    FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ledger_entries"
    ADD CONSTRAINT "ledger_entries_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ledger_entries"
    ADD CONSTRAINT "ledger_entries_payout_request_id_fkey"
    FOREIGN KEY ("payout_request_id") REFERENCES "payout_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ledger_entries"
    ADD CONSTRAINT "ledger_entries_refund_id_fkey"
    FOREIGN KEY ("refund_id") REFERENCES "payment_refunds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "payout_requests"
    ADD CONSTRAINT "payout_requests_destination_id_fkey"
    FOREIGN KEY ("destination_id") REFERENCES "creator_payout_destinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
