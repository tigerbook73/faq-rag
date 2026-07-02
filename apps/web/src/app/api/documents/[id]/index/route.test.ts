/**
 * @test-file   /api/documents/[id]/index POST
 * @description Validates parse-and-split trigger on confirmed upload
 * @ai-generated
 * @reviewed-by (!HUMAN EDIT ONLY):
 */

const mockGetDocumentForWrite = jest.fn();
const mockSetDocumentUploaded = jest.fn();
const mockParseAndSplitDocument = jest.fn();

jest.mock("@/lib/server/data/documents", () => ({
  getDocumentForWrite: (...args: unknown[]) => mockGetDocumentForWrite(...args),
  setDocumentUploaded: (...args: unknown[]) => mockSetDocumentUploaded(...args),
}));

jest.mock("@/lib/server/ingest/pipeline", () => ({
  parseAndSplitDocument: (...args: unknown[]) => mockParseAndSplitDocument(...args),
}));

import { POST } from "./route";

const params = { params: Promise.resolve({ id: "doc-1" }) };

/**
 * @test-suite  POST /api/documents/[id]/index
 * @target      parse-and-split trigger on upload confirmation
 * @strategy    unit, mocks getDocumentForWrite, setDocumentUploaded, parseAndSplitDocument
 * @cases
 *   - [PASS] returns queued and calls parseAndSplitDocument when document exists and has fileRef
 *   - [PASS] returns already_processing when document is not in pending state
 *   - [FAIL] returns 404 when the document does not exist
 *   - [FAIL] returns 422 when fileRef is missing
 */
describe("/api/documents/[id]/index", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetDocumentUploaded.mockResolvedValue({ count: 1 });
    mockParseAndSplitDocument.mockResolvedValue(undefined);
  });

  it("returns queued and calls parseAndSplitDocument when document exists and has fileRef", async () => {
    mockGetDocumentForWrite.mockResolvedValue({ id: "doc-1", fileRef: "embed/doc-1/faq.md" });

    const res = await POST(new Request("http://localhost/api/documents/doc-1/index") as never, params);

    expect(res.status).toBe(200);
    expect(mockSetDocumentUploaded).toHaveBeenCalledWith("doc-1");
    expect(mockParseAndSplitDocument).toHaveBeenCalledWith("doc-1", "embed/doc-1/faq.md");
    expect(await res.json()).toEqual({ status: "queued" });
  });

  it("returns already_processing when document is not in pending state", async () => {
    mockGetDocumentForWrite.mockResolvedValue({ id: "doc-1", fileRef: "embed/doc-1/faq.md" });
    mockSetDocumentUploaded.mockResolvedValue({ count: 0 });

    const res = await POST(new Request("http://localhost/api/documents/doc-1/index") as never, params);

    expect(res.status).toBe(200);
    expect(mockParseAndSplitDocument).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ status: "already_processing" });
  });

  it("returns 404 when the document does not exist", async () => {
    mockGetDocumentForWrite.mockResolvedValue(null);

    const res = await POST(new Request("http://localhost/api/documents/doc-1/index") as never, params);

    expect(res.status).toBe(404);
    expect(mockSetDocumentUploaded).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("returns 422 when fileRef is missing", async () => {
    mockGetDocumentForWrite.mockResolvedValue({ id: "doc-1", fileRef: null });

    const res = await POST(new Request("http://localhost/api/documents/doc-1/index") as never, params);

    expect(res.status).toBe(422);
    expect(mockParseAndSplitDocument).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ error: "File not yet uploaded" });
  });
});
