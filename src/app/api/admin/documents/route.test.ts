const mockRequireAdmin = jest.fn();
const mockListAdminDocuments = jest.fn();

jest.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

jest.mock("@/lib/data/documents", () => ({
  listAdminDocuments: (...args: unknown[]) => mockListAdminDocuments(...args),
}));

import { GET } from "./route";

describe("/api/admin/documents", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ id: "admin-1", role: "admin" });
  });

  it("requires admin and lists all documents", async () => {
    mockListAdminDocuments.mockResolvedValue({
      items: [{ id: "doc-1", ownerUserId: "user-1" }],
      total: 1,
    });

    const res = await GET({
      nextUrl: new URL("http://localhost/api/admin/documents?page=2&pageSize=10"),
    } as never);

    expect(res.status).toBe(200);
    expect(mockRequireAdmin).toHaveBeenCalledTimes(1);
    expect(mockListAdminDocuments).toHaveBeenCalledWith({ skip: 10, take: 10 });
    expect(await res.json()).toEqual({
      items: [{ id: "doc-1", ownerUserId: "user-1" }],
      total: 1,
      page: 2,
      pageSize: 10,
    });
  });
});
