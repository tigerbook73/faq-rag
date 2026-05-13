const mockRequireAdmin = jest.fn();
const mockDeleteDocument = jest.fn();

jest.mock("@/lib/server/auth/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

jest.mock("@/lib/server/services/delete-document", () => ({
  deleteDocument: (...args: unknown[]) => mockDeleteDocument(...args),
}));

import { DELETE } from "./route";

const params = { params: Promise.resolve({ id: "doc-1" }) };

describe("/api/admin/documents/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ id: "admin-1", role: "admin" });
  });

  it("deletes documents through the shared document deletion service", async () => {
    mockDeleteDocument.mockResolvedValue({ id: "doc-1" });

    const res = await DELETE(new Request("http://localhost/api/admin/documents/doc-1") as never, params);

    expect(res.status).toBe(204);
    expect(mockRequireAdmin).toHaveBeenCalledTimes(1);
    expect(mockDeleteDocument).toHaveBeenCalledWith("doc-1");
  });

  it("returns 404 when the document does not exist", async () => {
    mockDeleteDocument.mockResolvedValue(null);

    const res = await DELETE(new Request("http://localhost/api/admin/documents/doc-1") as never, params);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });
});
