-- pg_net is pre-installed in Supabase (local and cloud); no CREATE EXTENSION needed.
-- hook_url and hook_secret are injected via:
--   ALTER DATABASE postgres SET app.ingest_hook_url = 'https://your-app.vercel.app/api/ingest-hook';
--   ALTER DATABASE postgres SET app.ingest_hook_secret = 'your-secret';
-- In production, configure these via Supabase Dashboard → Database → Settings, or Vault.
-- Local dev: webhook will not fire (Docker cannot reach localhost:3000);
-- the client-side A-path (/api/documents/[id]/index) handles indexing instead.

CREATE OR REPLACE FUNCTION storage_notify_indexing()
RETURNS trigger AS $$
DECLARE
  hook_url    text := current_setting('app.ingest_hook_url', true);
  hook_secret text := current_setting('app.ingest_hook_secret', true);
BEGIN
  -- Only process uploads in the 'documents' bucket under the 'embed/' prefix.
  -- The prefix namespaces document uploads; other files in the bucket are ignored.
  IF NEW.bucket_id <> 'documents' OR NEW.name NOT LIKE 'embed/%' THEN
    RETURN NEW;
  END IF;

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
    body    := jsonb_build_object('docId', split_part(NEW.name, '/', 2))::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS after_document_upload ON storage.objects;

CREATE TRIGGER after_document_upload
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION storage_notify_indexing();
