-- Add nullable owner column for existing deployments. New writes must set user_id.
ALTER TABLE "sessions" ADD COLUMN "user_id" TEXT;

CREATE INDEX "sessions_user_id_updated_at_idx" ON "sessions"("user_id", "updated_at");
