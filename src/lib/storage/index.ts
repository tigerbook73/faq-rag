import { createSupabaseServiceClient } from "../supabase/server";

const BUCKET = "documents";

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
}

// Storage path convention (load-bearing — do not change without updating the trigger):
//   Format : "embed/{docId}/{sanitizedFilename}"
//   Example: "embed/a1b2c3d4-…/my_document.pdf"
//
// The "embed/" prefix namespaces uploads to avoid conflicts with other files in the bucket.
// The ingest-hook PostgreSQL trigger (migration 20260430120000_ingest_hook_trigger)
// filters on NEW.name LIKE 'embed/%' and extracts the docId via split_part(NEW.name, '/', 2).
// Any format change here must be mirrored in that trigger's SQL.
export async function saveUploadedFile(buffer: Buffer, docId: string, filename: string): Promise<string> {
  const supabase = createSupabaseServiceClient();
  const storagePath = `embed/${docId}/${sanitizeFilename(filename)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, { upsert: false });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return storagePath;
}

export async function readUploadedFile(storagePath: string): Promise<Buffer> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error || !data) throw new Error(`Storage download failed: ${error?.message}`);
  return Buffer.from(await data.arrayBuffer());
}

export async function deleteUploadedFile(storagePath: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  await supabase.storage.from(BUCKET).remove([storagePath]);
}
