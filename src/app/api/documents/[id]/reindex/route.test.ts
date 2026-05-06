const mockRequireUser = jest.fn();
const mockGetDocumentForWrite = jest.fn();
const mockUpdate = jest.fn();
const mockProcessDocument = jest.fn();

jest.mock("@/lib/auth/require-user", () => ({
  requireUser: () => mockRequireUser(),
}));

jest.mock("@/lib/data/documents", () => ({
  getDocumentForWrite: (...args: unknown[]) => mockGetDocumentForWrite(...args),
}));

jest.mock("@/lib/db/client", () => ({
  prisma: {
    document: {
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

jest.mock("@/lib/ingest/pipeline", () => ({
  processDocument: (...args: unknown[]) => mockProcessDocument(...args),
}));

import { POST } from "./route";

const params = { params: Promise.resolve({ id: "doc-1" }) };

describe("/api/documents/[id]/reindex", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue({ id: "user-1", role: "user" });
  });

  it("reindexes only documents writable by the current actor", async () => {
    mockGetDocumentForWrite.mockResolvedValue({ id: "doc-1", ownerUserId: "user-1", fileRef: "embed/doc-1/faq.md" });

    const res = await POST(new Request("http://localhost/api/documents/doc-1/reindex") as never, params);

    expect(res.status).toBe(200);
    expect(mockGetDocumentForWrite).toHaveBeenCalledWith({ id: "user-1", role: "user" }, "doc-1");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "doc-1" },
      data: { status: "pending", errorMsg: null },
    });
    expect(mockProcessDocument).toHaveBeenCalledWith("doc-1", "embed/doc-1/faq.md");
    expect(await res.json()).toEqual({ status: "indexed" });
  });

  it("returns 404 when the actor cannot write the document", async () => {
    mockGetDocumentForWrite.mockResolvedValue(null);

    const res = await POST(new Request("http://localhost/api/documents/doc-1/reindex") as never, params);

    expect(res.status).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ error: "Not found" });
  });
});
