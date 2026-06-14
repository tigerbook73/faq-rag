const mockGetDocumentForWrite = jest.fn();
const mockSetDocumentUploaded = jest.fn();
const mockEnqueueIndexing = jest.fn();
const mockProcessDocument = jest.fn();

jest.mock("@/lib/server/data/documents", () => ({
  getDocumentForWrite: (...args: unknown[]) => mockGetDocumentForWrite(...args),
  setDocumentUploaded: (...args: unknown[]) => mockSetDocumentUploaded(...args),
}));

jest.mock("@/lib/shared/config", () => ({
  config: { embedding: { useOpenAI: false } },
}));

jest.mock("@/lib/server/ingest/indexing-queue", () => ({
  enqueueIndexing: (...args: unknown[]) => mockEnqueueIndexing(...args),
}));

jest.mock("@/lib/server/ingest/pipeline", () => ({
  processDocument: (...args: unknown[]) => mockProcessDocument(...args),
}));

import { POST } from "./route";

const params = { params: Promise.resolve({ id: "doc-1" }) };

describe("/api/documents/[id]/index", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetDocumentUploaded.mockResolvedValue({ count: 1 });
  });

  it("queues indexing for an existing document", async () => {
    mockGetDocumentForWrite.mockResolvedValue({ id: "doc-1", fileRef: "embed/doc-1/faq.md" });

    const res = await POST(new Request("http://localhost/api/documents/doc-1/index") as never, params);

    expect(res.status).toBe(200);
    expect(mockGetDocumentForWrite).toHaveBeenCalledWith("doc-1");
    expect(mockSetDocumentUploaded).toHaveBeenCalledWith("doc-1");
    expect(mockEnqueueIndexing).toHaveBeenCalledWith("doc-1", "embed/doc-1/faq.md");
    expect(mockProcessDocument).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ status: "queued" });
  });

  it("returns 404 when the document does not exist", async () => {
    mockGetDocumentForWrite.mockResolvedValue(null);

    const res = await POST(new Request("http://localhost/api/documents/doc-1/index") as never, params);

    expect(res.status).toBe(404);
    expect(mockSetDocumentUploaded).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ error: "Not found" });
  });
});
