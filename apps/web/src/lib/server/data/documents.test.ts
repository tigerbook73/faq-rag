const mockFindUnique = jest.fn();
const mockFindMany = jest.fn();
const mockCount = jest.fn();

jest.mock("@/lib/server/db/client", () => ({
  prisma: {
    document: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}));

import { getDocumentForWrite, listDocumentsPage } from "./documents";

describe("document data access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the document when it exists", async () => {
    mockFindUnique.mockResolvedValue({ id: "doc-1", name: "test.md" });

    const doc = await getDocumentForWrite("doc-1");

    expect(doc).toEqual({ id: "doc-1", name: "test.md" });
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: "doc-1" } });
  });

  it("returns null when the document does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);

    const doc = await getDocumentForWrite("missing");

    expect(doc).toBeNull();
  });

  describe("listDocumentsPage", () => {
    beforeEach(() => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);
    });

    it("filters by embeddingModel when provided", async () => {
      await listDocumentsPage({ skip: 0, take: 20, embeddingModel: "bge-m3" });

      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { embeddingModel: "bge-m3" } }));
      expect(mockCount).toHaveBeenCalledWith({ where: { embeddingModel: "bge-m3" } });
    });

    it("does not filter when embeddingModel is omitted", async () => {
      await listDocumentsPage({ skip: 0, take: 20 });

      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
      expect(mockCount).toHaveBeenCalledWith({ where: {} });
    });
  });
});
