/**
 * @test-file   document api
 * @description Covers listDocuments/prepareUpload/embedBatch/deleteDocument against a mocked fetch
 * @ai-generated
 * @reviewed-by (!HUMAN EDIT ONLY):
 */
import { listDocuments, prepareUpload, embedBatch, deleteDocument } from "../document";

function mockFetchOnce(body: unknown, init: Partial<Response> = {}) {
  (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => body,
    ...init,
  });
}

const document = {
  id: "d1",
  name: "a.pdf",
  lang: "en",
  status: "indexed" as const,
  sizeBytes: 100,
  errorMsg: null,
  totalChunks: 3,
  embeddingModel: "bge-m3",
  createdAt: "2026-01-01T00:00:00.000Z",
  isBuiltIn: false,
  _count: { chunks: 3 },
};

/**
 * @test-suite  document api
 * @target      apps/mobile/src/lib/api/document.ts
 * @strategy    unit, globalThis.fetch mocked
 * @cases
 *   - [PASS] listDocuments parses items and total from the paged response
 *   - [FAIL] prepareUpload throws with the server's error message on 409 duplicate
 *   - [PASS] prepareUpload returns the parsed output on success
 *   - [PASS] embedBatch stops when the server reports remaining=0
 *   - [PASS] deleteDocument resolves on a 2xx response
 *   - [FAIL] deleteDocument throws with the server's error on failure
 */
describe("document api", () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
  });

  it("listDocuments parses items and total from the paged response", async () => {
    mockFetchOnce({ items: [document], total: 1, page: 1, pageSize: 20 });

    const result = await listDocuments();

    expect(globalThis.fetch).toHaveBeenCalledWith("http://test.local/api/documents?page=1&pageSize=20");
    expect(result).toEqual({ items: [document], total: 1 });
  });

  it("prepareUpload throws with the server's error message on 409 duplicate", async () => {
    mockFetchOnce({ error: "File already exists" }, { ok: false, status: 409 });

    await expect(
      prepareUpload({ name: "a.pdf", size: 100, mime: "application/pdf", hash: "h".repeat(64) }),
    ).rejects.toThrow("File already exists");
  });

  it("prepareUpload returns the parsed output on success", async () => {
    mockFetchOnce({ docId: "d1", signedUrl: "https://x", token: "t", document });

    const result = await prepareUpload({ name: "a.pdf", size: 100, mime: "application/pdf", hash: "h".repeat(64) });

    expect(result.docId).toBe("d1");
  });

  it("embedBatch stops when the server reports remaining=0", async () => {
    mockFetchOnce({ embedded: 0, remaining: 0, status: "indexed" });

    const result = await embedBatch("d1");

    expect(result).toEqual({ embedded: 0, remaining: 0, status: "indexed" });
  });

  it("deleteDocument resolves on a 2xx response", async () => {
    mockFetchOnce(null, { ok: true, status: 204 });
    await expect(deleteDocument("d1")).resolves.toBeUndefined();
  });

  it("deleteDocument throws with the server's error on failure", async () => {
    mockFetchOnce({ error: "Built-in documents cannot be deleted" }, { ok: false, status: 403 });
    await expect(deleteDocument("builtin")).rejects.toThrow("Built-in documents cannot be deleted");
  });
});
