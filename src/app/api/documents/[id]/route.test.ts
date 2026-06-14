const mockGetDocumentForWrite = jest.fn();
const mockDeleteDocument = jest.fn();

jest.mock("@/lib/server/data/documents", () => ({
  getDocumentForWrite: (...args: unknown[]) => mockGetDocumentForWrite(...args),
}));

jest.mock("@/lib/server/services/delete-document", () => ({
  deleteDocument: (...args: unknown[]) => mockDeleteDocument(...args),
}));

import { DELETE } from "./route";

const params = { params: Promise.resolve({ id: "doc-1" }) };

describe("/api/documents/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteDocument.mockResolvedValue({});
  });

  it("deletes an existing document", async () => {
    mockGetDocumentForWrite.mockResolvedValue({ id: "doc-1", fileRef: "embed/doc-1/faq.md" });

    const res = await DELETE(new Request("http://localhost/api/documents/doc-1") as never, params);

    expect(res.status).toBe(204);
    expect(mockGetDocumentForWrite).toHaveBeenCalledWith("doc-1");
    expect(mockDeleteDocument).toHaveBeenCalledWith("doc-1");
  });

  it("returns 404 when the document does not exist", async () => {
    mockGetDocumentForWrite.mockResolvedValue(null);

    const res = await DELETE(new Request("http://localhost/api/documents/doc-1") as never, params);

    expect(res.status).toBe(404);
    expect(mockDeleteDocument).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ error: "Not found" });
  });
});
