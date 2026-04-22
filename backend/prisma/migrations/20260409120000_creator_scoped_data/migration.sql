-- Multi-tenant scoping for creator dashboards.

ALTER TABLE "users" ADD COLUMN "creator_id" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN "creator_id" TEXT;
ALTER TABLE "payments" ADD COLUMN "creator_id" TEXT;
ALTER TABLE "creator_rewards" ADD COLUMN "creator_id" TEXT;
ALTER TABLE "obs_stream_links" ADD COLUMN "creator_id" TEXT;

UPDATE "users" u
SET "creator_id" = c.id
FROM (
  SELECT id FROM "creators"
  ORDER BY CASE WHEN slug = 'mohagamer' THEN 0 ELSE 1 END, "created_at" ASC
  LIMIT 1
) c
WHERE EXISTS (SELECT 1 FROM "creators" LIMIT 1);

UPDATE "payments" p
SET "creator_id" = c.id
FROM (
  SELECT id FROM "creators"
  ORDER BY CASE WHEN slug = 'mohagamer' THEN 0 ELSE 1 END, "created_at" ASC
  LIMIT 1
) c
WHERE EXISTS (SELECT 1 FROM "creators" LIMIT 1);

UPDATE "subscriptions" s
SET "creator_id" = c.id
FROM (
  SELECT id FROM "creators"
  ORDER BY CASE WHEN slug = 'mohagamer' THEN 0 ELSE 1 END, "created_at" ASC
  LIMIT 1
) c
WHERE EXISTS (SELECT 1 FROM "creators" LIMIT 1);

UPDATE "creator_rewards" r
SET "creator_id" = c.id
FROM (
  SELECT id FROM "creators"
  ORDER BY CASE WHEN slug = 'mohagamer' THEN 0 ELSE 1 END, "created_at" ASC
  LIMIT 1
) c
WHERE EXISTS (SELECT 1 FROM "creators" LIMIT 1);

UPDATE "obs_stream_links" o
SET "creator_id" = c.id
FROM (
  SELECT id FROM "creators"
  ORDER BY CASE WHEN slug = 'mohagamer' THEN 0 ELSE 1 END, "created_at" ASC
  LIMIT 1
) c
WHERE EXISTS (SELECT 1 FROM "creators" LIMIT 1);

CREATE INDEX "users_creator_id_idx" ON "users"("creator_id");
CREATE INDEX "subscriptions_creator_id_idx" ON "subscriptions"("creator_id");
CREATE INDEX "payments_creator_id_idx" ON "payments"("creator_id");
CREATE INDEX "creator_rewards_creator_id_idx" ON "creator_rewards"("creator_id");
CREATE INDEX "obs_stream_links_creator_id_idx" ON "obs_stream_links"("creator_id");

ALTER TABLE "users" ADD CONSTRAINT "users_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "creator_rewards" ADD CONSTRAINT "creator_rewards_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "obs_stream_links" ADD CONSTRAINT "obs_stream_links_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE SET NULL ON UPDATE CASCADE;
