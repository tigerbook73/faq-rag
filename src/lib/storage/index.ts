import { createSupabaseServiceClient } from "../supabase/server";

const BUCKET = "documents";

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
}

export async function saveUploadedFile(buffer: Buffer, docId: string, filename: string): Promise<string> {
  const supabase = createSupabaseServiceClient();
  const storagePath = `${docId}/${sanitizeFilename(filename)}`;
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
