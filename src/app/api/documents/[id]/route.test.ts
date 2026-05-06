const mockRequireUser = jest.fn();
const mockGetDocumentForWrite = jest.fn();
const mockDeleteDocumentById = jest.fn();
const mockDeleteUploadedFile = jest.fn();

jest.mock("@/lib/auth/require-user", () => ({
  requireUser: () => mockRequireUser(),
}));

jest.mock("@/lib/data/documents", () => ({
  getDocumentForWrite: (...args: unknown[]) => mockGetDocumentForWrite(...args),
  deleteDocumentById: (...args: unknown[]) => mockDeleteDocumentById(...args),
}));

jest.mock("@/lib/storage", () => ({
  deleteUploadedFile: (...args: unknown[]) => mockDeleteUploadedFile(...args),
}));

import { DELETE } from "./route";

const params = { params: Promise.resolve({ id: "doc-1" }) };

describe("/api/documents/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue({ id: "user-1", role: "user" });
    mockDeleteUploadedFile.mockResolvedValue(undefined);
    mockDeleteDocumentById.mockResolvedValue({});
  });

  it("deletes documents writable by the current actor", async () => {
    mockGetDocumentForWrite.mockResolvedValue({ id: "doc-1", ownerUserId: "user-1", fileRef: "embed/doc-1/faq.md" });

    const res = await DELETE(new Request("http://localhost/api/documents/doc-1") as never, params);

    expect(res.status).toBe(204);
    expect(mockGetDocumentForWrite).toHaveBeenCalledWith({ id: "user-1", role: "user" }, "doc-1");
    expect(mockDeleteUploadedFile).toHaveBeenCalledWith("embed/doc-1/faq.md");
    expect(mockDeleteDocumentById).toHaveBeenCalledWith("doc-1");
  });

  it("returns 404 when the actor cannot write the document", async () => {
    mockGetDocumentForWrite.mockResolvedValue(null);

    const res = await DELETE(new Request("http://localhost/api/documents/doc-1") as never, params);

    expect(res.status).toBe(404);
    expect(mockDeleteDocumentById).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ error: "Not found" });
  });
});
