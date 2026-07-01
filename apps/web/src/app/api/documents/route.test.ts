const mockListDocumentsPage = jest.fn();

jest.mock("@/lib/server/data/documents", () => ({
  listDocumentsPage: (...args: unknown[]) => mockListDocumentsPage(...args),
}));

import { GET } from "./route";

describe("/api/documents", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists documents with pagination", async () => {
    mockListDocumentsPage.mockResolvedValue({
      items: [{ id: "doc-1" }],
      total: 1,
    });

    const res = await GET({
      nextUrl: new URL("http://localhost/api/documents?page=2&pageSize=10"),
    } as never);

    expect(res.status).toBe(200);
    expect(mockListDocumentsPage).toHaveBeenCalledWith({ skip: 10, take: 10 });
    expect(await res.json()).toEqual({
      items: [{ id: "doc-1" }],
      total: 1,
      page: 2,
      pageSize: 10,
    });
  });
});
