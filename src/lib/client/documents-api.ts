import {
  PrepareUploadOutputSchema,
  type PrepareUploadInput,
  type PrepareUploadOutput,
  type UpdateDocumentInput,
} from "../shared/schemas/document";

export async function prepareUpload(input: PrepareUploadInput): Promise<PrepareUploadOutput> {
  const res = await fetch("/api/documents/prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `Prepare failed (${res.status})`);
  }
  return PrepareUploadOutputSchema.parse(await res.json());
}

export async function confirmIndex(docId: string): Promise<void> {
  await fetch(`/api/documents/${docId}/index`, { method: "POST" });
}

export async function deleteDocument(id: string): Promise<void> {
  await fetch(`/api/documents/${id}`, { method: "DELETE" });
}

export async function reindexDocument(id: string): Promise<void> {
  const res = await fetch(`/api/documents/${id}/reindex`, { method: "POST" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `Reindex failed (${res.status})`);
  }
}

export async function updateDocumentVisibility(id: string, visibility: UpdateDocumentInput["visibility"]): Promise<void> {
  const input: UpdateDocumentInput = { visibility };
  const res = await fetch(`/api/documents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `Visibility update failed (${res.status})`);
  }
}
