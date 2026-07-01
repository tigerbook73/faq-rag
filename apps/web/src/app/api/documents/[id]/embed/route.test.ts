/**
 * @test-file   /api/documents/[id]/embed POST
 * @description Validates incremental embedding batch endpoint
 * @ai-generated
 * @reviewed-by (!HUMAN EDIT ONLY):
 */

const mockGetDocumentForWrite = jest.fn();
const mockFindUnembeddedChunks = jest.fn();
const mockCountUnembeddedChunks = jest.fn();
const mockUpdateChunkEmbeddings = jest.fn();
const mockSetDocumentIndexed = jest.fn();
const mockGetEmbeddingsBatch = jest.fn();

jest.mock("@/lib/server/data/documents", () => ({
  getDocumentForWrite: (...args: unknown[]) => mockGetDocumentForWrite(...args),
  findUnembeddedChunks: (...args: unknown[]) => mockFindUnembeddedChunks(...args),
  countUnembeddedChunks: (...args: unknown[]) => mockCountUnembeddedChunks(...args),
  updateChunkEmbeddings: (...args: unknown[]) => mockUpdateChunkEmbeddings(...args),
  setDocumentIndexed: (...args: unknown[]) => mockSetDocumentIndexed(...args),
}));

jest.mock("@/lib/server/embeddings/router", () => ({
  getEmbeddingsBatch: (...args: unknown[]) => mockGetEmbeddingsBatch(...args),
}));

import { POST } from "./route";

const params = { params: Promise.resolve({ id: "doc-1" }) };
const fakeEmbedding = [0.1, 0.2, 0.3];

function jsonRequest(body: unknown = {}) {
  return new Request("http://localhost/api/documents/doc-1/embed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * @test-suite  POST /api/documents/[id]/embed
 * @target      incremental embedding of null-embedding chunks
 * @strategy    unit, mocks DB helpers and getEmbeddingsBatch
 * @cases
 *   - [PASS] embeds a batch and returns remaining count when chunks remain
 *   - [PASS] embeds final batch and sets document indexed when no chunks remain
 *   - [PASS] sets document indexed and returns when no unembedded chunks found
 *   - [PASS] returns current status immediately when document is not indexing
 *   - [FAIL] returns 404 when the document does not exist
 */
describe("/api/documents/[id]/embed", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateChunkEmbeddings.mockResolvedValue(undefined);
    mockSetDocumentIndexed.mockResolvedValue(undefined);
    mockGetEmbeddingsBatch.mockResolvedValue([fakeEmbedding]);
  });

  it("embeds a batch and returns remaining count when chunks remain", async () => {
    mockGetDocumentForWrite.mockResolvedValue({ id: "doc-1", status: "indexing" });
    mockFindUnembeddedChunks.mockResolvedValue([{ id: "chunk-1", content: "hello" }]);
    mockCountUnembeddedChunks.mockResolvedValue(5);

    const res = await POST(jsonRequest({ batchSize: 1 }) as never, params);

    expect(res.status).toBe(200);
    expect(mockGetEmbeddingsBatch).toHaveBeenCalledWith(["hello"]);
    expect(mockUpdateChunkEmbeddings).toHaveBeenCalledWith([{ id: "chunk-1", embedding: fakeEmbedding }]);
    expect(mockSetDocumentIndexed).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ embedded: 1, remaining: 5, status: "indexing" });
  });

  it("embeds final batch and sets document indexed when no chunks remain", async () => {
    mockGetDocumentForWrite.mockResolvedValue({ id: "doc-1", status: "indexing" });
    mockFindUnembeddedChunks.mockResolvedValue([{ id: "chunk-1", content: "hello" }]);
    mockCountUnembeddedChunks.mockResolvedValue(0);

    const res = await POST(jsonRequest() as never, params);

    expect(res.status).toBe(200);
    expect(mockSetDocumentIndexed).toHaveBeenCalledWith("doc-1");
    expect(await res.json()).toEqual({ embedded: 1, remaining: 0, status: "indexed" });
  });

  it("sets document indexed and returns when no unembedded chunks found", async () => {
    mockGetDocumentForWrite.mockResolvedValue({ id: "doc-1", status: "indexing" });
    mockFindUnembeddedChunks.mockResolvedValue([]);

    const res = await POST(jsonRequest() as never, params);

    expect(res.status).toBe(200);
    expect(mockGetEmbeddingsBatch).not.toHaveBeenCalled();
    expect(mockSetDocumentIndexed).toHaveBeenCalledWith("doc-1");
    expect(await res.json()).toEqual({ embedded: 0, remaining: 0, status: "indexed" });
  });

  it("returns current status immediately when document is not indexing", async () => {
    mockGetDocumentForWrite.mockResolvedValue({ id: "doc-1", status: "indexed" });

    const res = await POST(jsonRequest() as never, params);

    expect(res.status).toBe(200);
    expect(mockFindUnembeddedChunks).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ embedded: 0, remaining: 0, status: "indexed" });
  });

  it("returns 404 when the document does not exist", async () => {
    mockGetDocumentForWrite.mockResolvedValue(null);

    const res = await POST(jsonRequest() as never, params);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });
});
