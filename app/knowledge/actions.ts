"use server";

import { revalidatePath } from "next/cache";
import { ingestBuffer } from "@/src/lib/ingest/pipeline";

export interface UploadState {
  success: number;
  failed: number;
  errors: string[];
  timestamp: number;
}

const ALLOWED_EXTS = [".md", ".txt", ".pdf", ".docx"];

export async function uploadDocuments(
  _prev: UploadState | null,
  formData: FormData,
): Promise<UploadState> {
  const files = formData.getAll("file") as File[];
  let success = 0;
  const errors: string[] = [];

  for (const file of files) {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      errors.push(`${file.name}: unsupported type`);
      continue;
    }
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      await ingestBuffer(file.name, buffer);
      success++;
    } catch (err) {
      errors.push(`${file.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  revalidatePath("/knowledge");
  return { success, failed: errors.length, errors, timestamp: Date.now() };
}
