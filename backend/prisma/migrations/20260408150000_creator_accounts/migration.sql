CREATE TABLE "creators" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(190) NOT NULL,
    "password" TEXT NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "display_name" VARCHAR(80) NOT NULL,
    "bio" VARCHAR(300),
    "avatar_url" VARCHAR(500),
    "primary_category" VARCHAR(80),
    "support_enabled" BOOLEAN NOT NULL DEFAULT true,
    "onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creators_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "creators_email_key" ON "creators"("email");
CREATE UNIQUE INDEX "creators_slug_key" ON "creators"("slug");
