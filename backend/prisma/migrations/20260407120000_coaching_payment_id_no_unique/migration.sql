-- If an older revision created a UNIQUE index on payment_id, replace it with a non-unique
-- index so nullable payment_id rows do not trigger Prisma "data loss" warnings on db push.
DROP INDEX IF EXISTS "coaching_bookings_payment_id_key";

CREATE INDEX IF NOT EXISTS "coaching_bookings_payment_id_idx" ON "coaching_bookings"("payment_id");
