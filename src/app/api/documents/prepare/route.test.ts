const mockFindDuplicateDocument = jest.fn();
const mockCreatePendingDocument = jest.fn();
const mockSetDocumentFileRef = jest.fn();
const mockDeleteDocumentById = jest.fn();
const mockCreateSignedUploadUrl = jest.fn();

jest.mock("@/lib/server/data/documents", () => ({
  findDuplicateDocument: (...args: unknown[]) => mockFindDuplicateDocument(...args),
  createPendingDocument: (...args: unknown[]) => mockCreatePendingDocument(...args),
  setDocumentFileRef: (...args: unknown[]) => mockSetDocumentFileRef(...args),
  deleteDocumentById: (...args: unknown[]) => mockDeleteDocumentById(...args),
}));

jest.mock("@/lib/server/supabase/server", () => ({
  createSupabaseServiceClient: () => ({
    storage: {
      from: () => ({
        createSignedUploadUrl: (...args: unknown[]) => mockCreateSignedUploadUrl(...args),
      }),
    },
  }),
}));

import { POST } from "./route";

const validHash = "a".repeat(64);

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/documents/prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/documents/prepare", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindDuplicateDocument.mockResolvedValue(null);
    mockCreatePendingDocument.mockResolvedValue({
      id: "doc-1",
      name: "FAQ Doc.md",
      status: "pending",
      _count: { chunks: 0 },
    });
    mockSetDocumentFileRef.mockResolvedValue({});
    mockCreateSignedUploadUrl.mockResolvedValue({
      data: { signedUrl: "https://upload.test", token: "upload-token" },
      error: null,
    });
  });

  it("creates a pending document and returns a signed upload URL", async () => {
    const res = await POST(
      jsonRequest({ name: "FAQ Doc.md", size: 100, mime: "text/markdown", hash: validHash }) as never,
    );

    expect(res.status).toBe(201);
    expect(mockFindDuplicateDocument).toHaveBeenCalledWith(validHash);
    expect(mockCreatePendingDocument).toHaveBeenCalledWith({
      name: "FAQ Doc.md",
      mime: "text/markdown",
      contentHash: validHash,
      sizeBytes: 100,
    });
    expect(mockCreateSignedUploadUrl).toHaveBeenCalledWith("embed/doc-1/FAQ_Doc.md");
    expect(mockSetDocumentFileRef).toHaveBeenCalledWith("doc-1", "embed/doc-1/FAQ_Doc.md");
    expect(await res.json()).toEqual({
      docId: "doc-1",
      signedUrl: "https://upload.test",
      token: "upload-token",
      document: {
        id: "doc-1",
        name: "FAQ Doc.md",
        status: "pending",
        _count: { chunks: 0 },
      },
    });
  });

  it("returns 409 when the content hash already exists", async () => {
    mockFindDuplicateDocument.mockResolvedValue({ id: "existing-doc" });

    const res = await POST(jsonRequest({ name: "faq.md", size: 100, mime: "text/markdown", hash: validHash }) as never);

    expect(res.status).toBe(409);
    expect(mockFindDuplicateDocument).toHaveBeenCalledWith(validHash);
    expect(mockCreatePendingDocument).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ error: "Duplicate file — already indexed" });
  });

  it("returns structured validation errors for invalid input", async () => {
    const res = await POST(jsonRequest({ name: "", size: 0, mime: "text/plain", hash: "bad" }) as never);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Validation failed",
      fieldErrors: expect.objectContaining({
        name: expect.any(Array),
        size: expect.any(Array),
        hash: expect.any(Array),
      }),
    });
  });
});
