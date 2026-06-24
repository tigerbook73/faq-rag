/**
 * @test-file   /api/documents/[id]/reindex POST
 * @description Validates reindex parse-and-split trigger with guard checks
 * @ai-generated
 * @reviewed-by (!HUMAN EDIT ONLY):
 */

const mockGetDocumentForWrite = jest.fn();
const mockParseAndSplitDocument = jest.fn();

jest.mock("@/lib/server/data/documents", () => ({
  getDocumentForWrite: (...args: unknown[]) => mockGetDocumentForWrite(...args),
}));

jest.mock("@/lib/server/ingest/pipeline", () => ({
  parseAndSplitDocument: (...args: unknown[]) => mockParseAndSplitDocument(...args),
}));

import { POST } from "./route";

const params = { params: Promise.resolve({ id: "doc-1" }) };

/**
 * @test-suite  POST /api/documents/[id]/reindex
 * @target      reindex trigger using parseAndSplitDocument
 * @strategy    unit, mocks getDocumentForWrite, parseAndSplitDocument
 * @cases
 *   - [PASS] returns queued and calls parseAndSplitDocument when document exists and has fileRef
 *   - [FAIL] returns 404 when the document does not exist
 *   - [FAIL] returns 403 when document is built-in
 *   - [FAIL] returns 422 when fileRef is missing
 */
describe("/api/documents/[id]/reindex", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParseAndSplitDocument.mockResolvedValue(undefined);
  });

  it("returns queued and calls parseAndSplitDocument when document exists and has fileRef", async () => {
    mockGetDocumentForWrite.mockResolvedValue({ id: "doc-1", fileRef: "embed/doc-1/faq.md", isBuiltIn: false });

    const res = await POST(new Request("http://localhost/api/documents/doc-1/reindex") as never, params);

    expect(res.status).toBe(200);
    expect(mockParseAndSplitDocument).toHaveBeenCalledWith("doc-1", "embed/doc-1/faq.md");
    expect(await res.json()).toEqual({ status: "queued" });
  });

  it("returns 404 when the document does not exist", async () => {
    mockGetDocumentForWrite.mockResolvedValue(null);

    const res = await POST(new Request("http://localhost/api/documents/doc-1/reindex") as never, params);

    expect(res.status).toBe(404);
    expect(mockParseAndSplitDocument).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("returns 403 when document is built-in", async () => {
    mockGetDocumentForWrite.mockResolvedValue({ id: "doc-1", fileRef: "embed/doc-1/faq.md", isBuiltIn: true });

    const res = await POST(new Request("http://localhost/api/documents/doc-1/reindex") as never, params);

    expect(res.status).toBe(403);
    expect(mockParseAndSplitDocument).not.toHaveBeenCalled();
  });

  it("returns 422 when fileRef is missing", async () => {
    mockGetDocumentForWrite.mockResolvedValue({ id: "doc-1", fileRef: null, isBuiltIn: false });

    const res = await POST(new Request("http://localhost/api/documents/doc-1/reindex") as never, params);

    expect(res.status).toBe(422);
    expect(mockParseAndSplitDocument).not.toHaveBeenCalled();
  });
});
