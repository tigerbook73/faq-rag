import { File, UploadType } from "expo-file-system";
import {
  DocumentItemSchema,
  DocumentListQuerySchema,
  PrepareUploadOutputSchema,
  EmbedBatchResultSchema,
  type DocumentItem,
  type DocumentListQuery,
  type PrepareUploadInput,
  type PrepareUploadOutput,
  type EmbedBatchResult,
} from "@faq-rag/shared";
import { getApiUrl } from "./config";

export async function listDocuments(
  query: Partial<DocumentListQuery> = {},
): Promise<{ items: DocumentItem[]; total: number }> {
  const { page, pageSize } = DocumentListQuerySchema.parse(query);
  const search = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  const res = await fetch(`${getApiUrl()}/api/documents?${search}`);
  if (!res.ok) throw new Error(`Failed to list documents: ${res.status}`);
  const data = await res.json();
  return {
    items: (data.items as unknown[]).map((d) => DocumentItemSchema.parse(d)),
    total: data.total as number,
  };
}

export async function prepareUpload(input: PrepareUploadInput): Promise<PrepareUploadOutput> {
  const res = await fetch(`${getApiUrl()}/api/documents/prepare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    // status lets callers distinguish 409 (duplicate) from other failures.
    const err = new Error((data as { error?: string }).error ?? `Prepare failed (${res.status})`) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
  return PrepareUploadOutputSchema.parse(await res.json());
}

/**
 * Uploads a local file to a Supabase Storage signed URL. Mirrors the web
 * client's multipart shape (empty field name + cacheControl form param) — see
 * apps/web/src/components/knowledge/UploadZone.tsx.
 */
export async function uploadToSupabase(
  fileUri: string,
  signedUrl: string,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  const file = new File(fileUri);
  const result = await file.upload(signedUrl, {
    httpMethod: "PUT",
    uploadType: UploadType.MULTIPART,
    fieldName: "",
    parameters: { cacheControl: "3600" },
    onProgress: onProgress
      ? ({ bytesSent, totalBytes }) => onProgress(totalBytes > 0 ? bytesSent / totalBytes : 0)
      : undefined,
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed (${result.status})`);
  }
}

export async function confirmIndex(docId: string): Promise<void> {
  const res = await fetch(`${getApiUrl()}/api/documents/${docId}/index`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to confirm index: ${res.status}`);
}

export async function embedBatch(docId: string, batchSize = 20): Promise<EmbedBatchResult> {
  const res = await fetch(`${getApiUrl()}/api/documents/${docId}/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ batchSize }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `Embed failed (${res.status})`);
  }
  return EmbedBatchResultSchema.parse(await res.json());
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${getApiUrl()}/api/documents/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `Failed to delete document: ${res.status}`);
  }
}

export async function reindexDocument(id: string): Promise<void> {
  const res = await fetch(`${getApiUrl()}/api/documents/${id}/reindex`, { method: "POST" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `Reindex failed (${res.status})`);
  }
}
