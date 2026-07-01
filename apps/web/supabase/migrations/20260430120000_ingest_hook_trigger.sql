-- Webhook configuration lives in app.ingest_config (separate from Prisma-managed public schema).
-- No superuser required — works with the postgres role in both local and cloud.
-- To configure:
--   UPDATE app.ingest_config SET value = 'https://your-app.vercel.app/api/ingest-hook' WHERE key = 'hook_url';
--   UPDATE app.ingest_config SET value = 'your-secret' WHERE key = 'hook_secret';
-- Local dev: run `pnpm hook:set` after `pnpm db:reset`.
-- Production: paste the UPDATE statements into Supabase Dashboard → SQL Editor.

CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE IF NOT EXISTS app.ingest_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

INSERT INTO app.ingest_config (key, value)
VALUES ('hook_url', ''), ('hook_secret', '')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION storage_notify_indexing()
RETURNS trigger AS $$
DECLARE
  hook_url    text;
  hook_secret text;
BEGIN
  -- Only process uploads in the 'documents' bucket under the 'embed/' prefix.
  -- The prefix namespaces document uploads; other files in the bucket are ignored.
  IF NEW.bucket_id <> 'documents' OR NEW.name NOT LIKE 'embed/%' THEN
    RETURN NEW;
  END IF;

  SELECT value INTO hook_url    FROM app.ingest_config WHERE key = 'hook_url';
  SELECT value INTO hook_secret FROM app.ingest_config WHERE key = 'hook_secret';

  IF hook_url IS NULL OR hook_url = '' THEN
    RETURN NEW;
  END IF;

  -- Storage object path format: "embed/{docId}/{sanitizedFilename}" (see src/lib/storage/index.ts → saveUploadedFile)
  -- split_part(NEW.name, '/', 2) extracts the second segment, which is the docId (UUID).
  -- The /api/ingest-hook handler validates this value with z.string().uuid().
  PERFORM net.http_post(
    url     := hook_url,
    headers := jsonb_build_object(
                 'Content-Type',     'application/json',
                 'x-webhook-secret', COALESCE(hook_secret, '')),
    body    := jsonb_build_object('docId', split_part(NEW.name, '/', 2))
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS after_document_upload ON storage.objects;

CREATE TRIGGER after_document_upload
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION storage_notify_indexing();
