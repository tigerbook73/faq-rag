const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockDeleteMany = jest.fn();
const mockTransaction = jest.fn();

jest.mock("@/lib/server/db/client", () => ({
  prisma: {
    document: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

import { updateDocumentVisibilityForOwner } from "./documents";

describe("document data access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction.mockImplementation((callback) =>
      callback({
        document: {
          update: (...args: unknown[]) => mockUpdate(...args),
        },
        publicDocumentSelection: {
          deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
        },
      }),
    );
  });

  it("updates visibility for the owner", async () => {
    mockFindUnique.mockResolvedValue({ ownerUserId: "user-1" });
    mockUpdate.mockResolvedValue({ id: "doc-1", visibility: "public" });

    const document = await updateDocumentVisibilityForOwner("user-1", "doc-1", "public");

    expect(document).toEqual({ id: "doc-1", visibility: "public" });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "doc-1" },
      data: { visibility: "public" },
      include: { _count: { select: { chunks: true } } },
    });
    expect(mockDeleteMany).not.toHaveBeenCalled();
  });

  it("deletes selections when a public document becomes private", async () => {
    mockFindUnique.mockResolvedValue({ ownerUserId: "user-1" });
    mockUpdate.mockResolvedValue({ id: "doc-1", visibility: "private" });

    await updateDocumentVisibilityForOwner("user-1", "doc-1", "private");

    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { documentId: "doc-1" } });
  });

  it("does not update visibility for another user's document", async () => {
    mockFindUnique.mockResolvedValue({ ownerUserId: "user-2" });

    const document = await updateDocumentVisibilityForOwner("user-1", "doc-1", "public");

    expect(document).toBeNull();
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
