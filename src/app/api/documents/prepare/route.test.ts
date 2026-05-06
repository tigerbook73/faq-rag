const mockRequireUser = jest.fn();
const mockFindDuplicateDocumentForOwner = jest.fn();
const mockCreatePendingDocumentForOwner = jest.fn();
const mockSetDocumentFileRef = jest.fn();
const mockDeleteDocumentById = jest.fn();
const mockCreateSignedUploadUrl = jest.fn();

jest.mock("@/lib/auth/require-user", () => ({
  requireUser: () => mockRequireUser(),
}));

jest.mock("@/lib/data/documents", () => ({
  findDuplicateDocumentForOwner: (...args: unknown[]) => mockFindDuplicateDocumentForOwner(...args),
  createPendingDocumentForOwner: (...args: unknown[]) => mockCreatePendingDocumentForOwner(...args),
  setDocumentFileRef: (...args: unknown[]) => mockSetDocumentFileRef(...args),
  deleteDocumentById: (...args: unknown[]) => mockDeleteDocumentById(...args),
}));

jest.mock("@/lib/supabase/server", () => ({
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
    mockRequireUser.mockResolvedValue({ id: "user-1", role: "user" });
    mockFindDuplicateDocumentForOwner.mockResolvedValue(null);
    mockCreatePendingDocumentForOwner.mockResolvedValue({ id: "doc-1" });
    mockSetDocumentFileRef.mockResolvedValue({});
    mockCreateSignedUploadUrl.mockResolvedValue({
      data: { signedUrl: "https://upload.test", token: "upload-token" },
      error: null,
    });
  });

  it("creates pending uploads owned by the current user", async () => {
    const res = await POST(
      jsonRequest({ name: "FAQ Doc.md", size: 100, mime: "text/markdown", hash: validHash }) as never,
    );

    expect(res.status).toBe(201);
    expect(mockFindDuplicateDocumentForOwner).toHaveBeenCalledWith("user-1", validHash);
    expect(mockCreatePendingDocumentForOwner).toHaveBeenCalledWith({
      ownerUserId: "user-1",
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
    });
  });

  it("checks duplicate content only within the current owner", async () => {
    mockFindDuplicateDocumentForOwner.mockResolvedValue({ id: "existing-doc", ownerUserId: "user-1" });

    const res = await POST(jsonRequest({ name: "faq.md", size: 100, mime: "text/markdown", hash: validHash }) as never);

    expect(res.status).toBe(409);
    expect(mockFindDuplicateDocumentForOwner).toHaveBeenCalledWith("user-1", validHash);
    expect(mockCreatePendingDocumentForOwner).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ error: "Duplicate file — already indexed" });
  });
});
