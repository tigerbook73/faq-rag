-- Revert multi-user: drop ownership, visibility, and user tables.

-- Remove foreign keys first.
ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "documents_owner_user_id_fkey";
ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_user_id_fkey";

-- Drop per-owner unique index, restore global content-hash uniqueness.
DROP INDEX IF EXISTS "documents_owner_user_id_content_hash_key";
CREATE UNIQUE INDEX "documents_content_hash_key" ON "documents"("content_hash");

-- Drop owner/visibility indexes.
DROP INDEX IF EXISTS "documents_owner_user_id_created_at_idx";
DROP INDEX IF EXISTS "documents_visibility_status_idx";

-- Drop session per-user index, restore plain updated_at index.
DROP INDEX IF EXISTS "sessions_user_id_updated_at_idx";
CREATE INDEX "sessions_updated_at_idx" ON "sessions"("updated_at");

-- Remove columns from documents.
ALTER TABLE "documents" DROP COLUMN IF EXISTS "owner_user_id";
ALTER TABLE "documents" DROP COLUMN IF EXISTS "visibility";

-- Remove column from sessions.
ALTER TABLE "sessions" DROP COLUMN IF EXISTS "user_id";

-- Drop dependent tables.
DROP TABLE IF EXISTS "public_document_selections";
DROP TABLE IF EXISTS "user_profiles";

-- Drop enums.
DROP TYPE IF EXISTS "DocumentVisibility";
DROP TYPE IF EXISTS "UserRole";
