import { IS_CLOUD } from "../config";

const BUCKET = "documents";

// Returns the storage path (local file path or Supabase Storage path)
export async function saveUploadedFile(buffer: Buffer, docId: string, filename: string): Promise<string> {
  if (IS_CLOUD) {
    const { createSupabaseServiceClient } = await import("../supabase/server");
    const supabase = createSupabaseServiceClient();
    const storagePath = `${docId}/${filename}`;
    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, { upsert: false });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    return storagePath;
  }

  const fs = await import("fs/promises");
  const path = await import("path");
  const uploadDir = process.env.UPLOAD_DIR ?? "./data/uploads";
  const localPath = path.default.join(uploadDir, docId, filename);
  await fs.default.mkdir(path.default.dirname(localPath), { recursive: true });
  await fs.default.writeFile(localPath, buffer);
  return localPath;
}

export async function readUploadedFile(storagePath: string): Promise<Buffer> {
  if (IS_CLOUD) {
    const { createSupabaseServiceClient } = await import("../supabase/server");
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
    if (error || !data) throw new Error(`Storage download failed: ${error?.message}`);
    return Buffer.from(await data.arrayBuffer());
  }

  const fs = await import("fs/promises");
  return fs.default.readFile(storagePath);
}

export async function deleteUploadedFile(storagePath: string): Promise<void> {
  if (IS_CLOUD) {
    const { createSupabaseServiceClient } = await import("../supabase/server");
    const supabase = createSupabaseServiceClient();
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return;
  }

  const fs = await import("fs/promises");
  const path = await import("path");
  await fs.default.rm(path.default.dirname(storagePath), { recursive: true, force: true });
}
