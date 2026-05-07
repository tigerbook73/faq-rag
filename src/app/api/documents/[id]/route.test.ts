const mockRequireUser = jest.fn();
const mockGetDocumentForWrite = jest.fn();
const mockUpdateDocumentVisibilityForOwner = jest.fn();
const mockDeleteDocument = jest.fn();

jest.mock("@/lib/auth/require-user", () => ({
  requireUser: () => mockRequireUser(),
}));

jest.mock("@/lib/data/documents", () => ({
  getDocumentForWrite: (...args: unknown[]) => mockGetDocumentForWrite(...args),
  updateDocumentVisibilityForOwner: (...args: unknown[]) => mockUpdateDocumentVisibilityForOwner(...args),
}));

jest.mock("@/lib/services/delete-document", () => ({
  deleteDocument: (...args: unknown[]) => mockDeleteDocument(...args),
}));

import { DELETE, PATCH } from "./route";

const params = { params: Promise.resolve({ id: "doc-1" }) };

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/documents/doc-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/documents/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue({ id: "user-1", role: "user" });
    mockDeleteDocument.mockResolvedValue({});
  });

  it("updates visibility only for the current owner", async () => {
    mockUpdateDocumentVisibilityForOwner.mockResolvedValue({ id: "doc-1", ownerUserId: "user-1", visibility: "public" });

    const res = await PATCH(jsonRequest({ visibility: "public" }) as never, params);

    expect(res.status).toBe(200);
    expect(mockUpdateDocumentVisibilityForOwner).toHaveBeenCalledWith("user-1", "doc-1", "public");
    expect(await res.json()).toEqual({ id: "doc-1", ownerUserId: "user-1", visibility: "public" });
  });

  it("returns 404 when changing visibility for a document the user does not own", async () => {
    mockUpdateDocumentVisibilityForOwner.mockResolvedValue(null);

    const res = await PATCH(jsonRequest({ visibility: "private" }) as never, params);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("deletes documents writable by the current actor", async () => {
    mockGetDocumentForWrite.mockResolvedValue({ id: "doc-1", ownerUserId: "user-1", fileRef: "embed/doc-1/faq.md" });

    const res = await DELETE(new Request("http://localhost/api/documents/doc-1") as never, params);

    expect(res.status).toBe(204);
    expect(mockGetDocumentForWrite).toHaveBeenCalledWith({ id: "user-1", role: "user" }, "doc-1");
    expect(mockDeleteDocument).toHaveBeenCalledWith("doc-1");
  });

  it("returns 404 when the actor cannot write the document", async () => {
    mockGetDocumentForWrite.mockResolvedValue(null);

    const res = await DELETE(new Request("http://localhost/api/documents/doc-1") as never, params);

    expect(res.status).toBe(404);
    expect(mockDeleteDocument).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ error: "Not found" });
  });
});
