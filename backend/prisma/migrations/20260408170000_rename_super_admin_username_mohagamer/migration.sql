-- Rename seeded super admin from "admin" -> "mohagamer" (same row: id, password, role unchanged).
-- Skips if "mohagamer" already exists or no matching super admin.
UPDATE "admins"
SET "username" = 'mohagamer'
WHERE "username" = 'admin'
  AND "role"::text = 'SUPER_ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM "admins" AS b WHERE b."username" = 'mohagamer'
  );
