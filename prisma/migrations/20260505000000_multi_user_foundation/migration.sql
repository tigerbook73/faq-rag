-- Multi-user foundation: business users, roles, document ownership, and public document selections.

-- Create enums
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');
CREATE TYPE "DocumentVisibility" AS ENUM ('private', 'public');

-- Create user profile table. The id matches Supabase Auth user ids.
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_profiles_email_key" ON "user_profiles"("email");

-- Fixed default admin id used by scripts/seed-users.ts.
-- Existing single-user data is assigned to this profile, then the seed script creates
-- the matching Supabase Auth user or reconciles if an auth user already exists.
INSERT INTO "user_profiles" ("id", "email", "role")
VALUES ('00000000-0000-4000-8000-000000000001', 'admin@test.com', 'admin')
ON CONFLICT ("id") DO NOTHING;

-- Documents: add owner and visibility, backfill existing documents to admin.
ALTER TABLE "documents" ADD COLUMN "owner_user_id" TEXT;
ALTER TABLE "documents" ADD COLUMN "visibility" "DocumentVisibility" NOT NULL DEFAULT 'private';

UPDATE "documents"
SET "owner_user_id" = '00000000-0000-4000-8000-000000000001'
WHERE "owner_user_id" IS NULL;

ALTER TABLE "documents" ALTER COLUMN "owner_user_id" SET NOT NULL;

-- Sessions: add owner and backfill existing sessions to admin.
ALTER TABLE "sessions" ADD COLUMN "user_id" TEXT;

UPDATE "sessions"
SET "user_id" = '00000000-0000-4000-8000-000000000001'
WHERE "user_id" IS NULL;

ALTER TABLE "sessions" ALTER COLUMN "user_id" SET NOT NULL;

-- Public document selections.
CREATE TABLE "public_document_selections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_document_selections_pkey" PRIMARY KEY ("id")
);

-- Replace global content-hash uniqueness with per-owner uniqueness.
DROP INDEX IF EXISTS "documents_content_hash_key";
CREATE UNIQUE INDEX "documents_owner_user_id_content_hash_key" ON "documents"("owner_user_id", "content_hash");

-- Indexes.
DROP INDEX IF EXISTS "sessions_updated_at_idx";
CREATE INDEX "sessions_user_id_updated_at_idx" ON "sessions"("user_id", "updated_at");
CREATE INDEX "documents_owner_user_id_created_at_idx" ON "documents"("owner_user_id", "created_at");
CREATE INDEX "documents_visibility_status_idx" ON "documents"("visibility", "status");
CREATE UNIQUE INDEX "public_document_selections_user_id_document_id_key" ON "public_document_selections"("user_id", "document_id");
CREATE INDEX "public_document_selections_document_id_idx" ON "public_document_selections"("document_id");

-- Foreign keys.
ALTER TABLE "documents" ADD CONSTRAINT "documents_owner_user_id_fkey"
    FOREIGN KEY ("owner_user_id") REFERENCES "user_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public_document_selections" ADD CONSTRAINT "public_document_selections_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public_document_selections" ADD CONSTRAINT "public_document_selections_document_id_fkey"
    FOREIGN KEY ("document_id") REFERENCES "documents"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
