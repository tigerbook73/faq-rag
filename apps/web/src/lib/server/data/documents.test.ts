const mockFindUnique = jest.fn();

jest.mock("@/lib/server/db/client", () => ({
  prisma: {
    document: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

import { getDocumentForWrite } from "./documents";

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
});
