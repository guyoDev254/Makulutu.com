-- Fan: email/Google accounts may not have a Kenyan mobile yet.
ALTER TABLE "fans" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "fans" ADD COLUMN IF NOT EXISTS "google_id" VARCHAR(64);
ALTER TABLE "fans" ADD COLUMN IF NOT EXISTS "email_verified_at" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "fans_google_id_key" ON "fans"("google_id");

-- Creator: Google-only accounts have no password hash.
ALTER TABLE "creators" ALTER COLUMN "password" DROP NOT NULL;
ALTER TABLE "creators" ADD COLUMN IF NOT EXISTS "google_id" VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS "creators_google_id_key" ON "creators"("google_id");
