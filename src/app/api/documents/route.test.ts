const mockRequireUser = jest.fn();
const mockListDocumentsPageForOwner = jest.fn();

jest.mock("@/lib/server/auth/require-user", () => ({
  requireUser: () => mockRequireUser(),
}));

jest.mock("@/lib/server/data/documents", () => ({
  listDocumentsPageForOwner: (...args: unknown[]) => mockListDocumentsPageForOwner(...args),
}));

import { GET } from "./route";

describe("/api/documents", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue({ id: "user-1", role: "user" });
  });

  it("lists documents for the current user", async () => {
    mockListDocumentsPageForOwner.mockResolvedValue({
      items: [{ id: "doc-1", ownerUserId: "user-1" }],
      total: 1,
    });

    const res = await GET({
      nextUrl: new URL("http://localhost/api/documents?page=2&pageSize=10"),
    } as never);

    expect(res.status).toBe(200);
    expect(mockListDocumentsPageForOwner).toHaveBeenCalledWith("user-1", { skip: 10, take: 10 });
    expect(await res.json()).toEqual({
      items: [{ id: "doc-1", ownerUserId: "user-1" }],
      total: 1,
      page: 2,
      pageSize: 10,
    });
  });
});
