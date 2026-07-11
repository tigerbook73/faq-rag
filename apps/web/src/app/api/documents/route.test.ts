const mockListDocumentsPage = jest.fn();
const mockGetEmbeddingModelId = jest.fn();

jest.mock("@/lib/server/data/documents", () => ({
  listDocumentsPage: (...args: unknown[]) => mockListDocumentsPage(...args),
}));

jest.mock("@/lib/server/embeddings/router", () => ({
  getEmbeddingModelId: () => mockGetEmbeddingModelId(),
}));

import { GET } from "./route";

describe("/api/documents", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmbeddingModelId.mockReturnValue("bge-m3");
  });

  it("lists documents with pagination, filtered to the active embedding model by default", async () => {
    mockListDocumentsPage.mockResolvedValue({
      items: [{ id: "doc-1" }],
      total: 1,
    });

    const res = await GET({
      nextUrl: new URL("http://localhost/api/documents?page=2&pageSize=10"),
    } as never);

    expect(res.status).toBe(200);
    expect(mockListDocumentsPage).toHaveBeenCalledWith({ skip: 10, take: 10, embeddingModel: "bge-m3" });
    expect(await res.json()).toEqual({
      items: [{ id: "doc-1" }],
      total: 1,
      page: 2,
      pageSize: 10,
    });
  });

  it("skips the embedding model filter when allModels=true", async () => {
    mockListDocumentsPage.mockResolvedValue({
      items: [{ id: "doc-1" }, { id: "doc-2" }],
      total: 2,
    });

    const res = await GET({
      nextUrl: new URL("http://localhost/api/documents?allModels=true"),
    } as never);

    expect(res.status).toBe(200);
    expect(mockListDocumentsPage).toHaveBeenCalledWith({ skip: 0, take: 20, embeddingModel: undefined });
  });
});
