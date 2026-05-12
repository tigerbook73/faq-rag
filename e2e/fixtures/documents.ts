import { type Page } from "@playwright/test";
import { createHash } from "crypto";

type PreparedDocument = {
  id: string;
  name: string;
};

async function prepareDocument(page: Page, input: { name: string; content: string }) {
  const hash = createHash("sha256").update(input.content).digest("hex");
  const res = await page.request.post("/api/documents/prepare", {
    data: {
      name: input.name,
      size: Buffer.byteLength(input.content),
      mime: "text/plain",
      hash,
    },
  });

  if (!res.ok()) {
    throw new Error(`Failed to prepare document ${input.name}: ${res.status()} ${await res.text()}`);
  }

  return (await res.json()) as { document: PreparedDocument; docId: string; signedUrl: string };
}

export async function createPendingDocument(page: Page, input: { name: string; content: string }) {
  const data = await prepareDocument(page, input);
  return data.document;
}

export async function uploadAndIndexTextDocument(page: Page, input: { name: string; content: string }) {
  const data = await prepareDocument(page, input);
  const uploadRes = await page.request.put(data.signedUrl, {
    multipart: {
      cacheControl: "3600",
      "": {
        name: input.name,
        mimeType: "text/plain",
        buffer: Buffer.from(input.content),
      },
    },
  });

  if (!uploadRes.ok()) {
    throw new Error(`Failed to upload document ${input.name}: ${uploadRes.status()} ${await uploadRes.text()}`);
  }

  const indexRes = await page.request.post(`/api/documents/${data.docId}/index`);
  if (!indexRes.ok()) {
    throw new Error(`Failed to index document ${input.name}: ${indexRes.status()} ${await indexRes.text()}`);
  }

  await waitForDocumentStatus(page, data.docId, "indexed");
  return data.document;
}

export async function setDocumentVisibility(page: Page, documentId: string, visibility: "private" | "public") {
  const res = await page.request.patch(`/api/documents/${documentId}`, {
    data: { visibility },
  });

  if (!res.ok()) {
    throw new Error(`Failed to set document visibility: ${res.status()} ${await res.text()}`);
  }
}

export async function waitForDocumentStatus(page: Page, documentId: string, status: string, timeoutMs = 60_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const docs = await listDocuments(page);
    const doc = docs.items.find((item) => item.id === documentId) as { status?: string; errorMsg?: string } | undefined;
    if (doc?.status === status) return doc;
    if (doc?.status === "failed") {
      throw new Error(`Document ${documentId} indexing failed: ${doc.errorMsg ?? "unknown error"}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`Timed out waiting for document ${documentId} to reach ${status}`);
}

export async function deleteDocumentIfExists(page: Page, documentId: string) {
  const res = await page.request.delete(`/api/documents/${documentId}`);
  if (![204, 404, 403].includes(res.status())) {
    throw new Error(`Failed to delete document ${documentId}: ${res.status()} ${await res.text()}`);
  }
}

export async function listDocuments(page: Page) {
  const res = await page.request.get("/api/documents");
  if (!res.ok()) {
    throw new Error(`Failed to list documents: ${res.status()} ${await res.text()}`);
  }
  return (await res.json()) as { items: Array<{ id: string; name: string; status?: string; errorMsg?: string }> };
}
