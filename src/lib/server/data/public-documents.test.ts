const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockUpsert = jest.fn();
const mockDeleteMany = jest.fn();

jest.mock("@/lib/server/db/client", () => ({
  prisma: {
    document: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    publicDocumentSelection: {
      upsert: (...args: unknown[]) => mockUpsert(...args),
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
    },
  },
}));

import {
  listSelectablePublicDocuments,
  selectPublicDocumentForUser,
  unselectPublicDocumentForUser,
} from "./public-documents";

describe("public document data access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists only other users' public indexed documents and marks selection state", async () => {
    mockFindMany.mockResolvedValue([
      { id: "doc-1", selections: [{ id: "selection-1" }] },
      { id: "doc-2", selections: [] },
    ]);

    const documents = await listSelectablePublicDocuments("user-2");

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        ownerUserId: { not: "user-2" },
        visibility: "public",
        status: "indexed",
      },
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { email: true } },
        selections: {
          where: { userId: "user-2" },
          select: { id: true },
        },
        _count: { select: { chunks: true } },
      },
    });
    expect(documents).toEqual([
      { id: "doc-1", selected: true },
      { id: "doc-2", selected: false },
    ]);
  });

  it("selects only another user's public indexed document", async () => {
    mockFindUnique.mockResolvedValue({ id: "doc-1", ownerUserId: "user-1", visibility: "public", status: "indexed" });
    mockUpsert.mockResolvedValue({ id: "selection-1", userId: "user-2", documentId: "doc-1" });

    const selection = await selectPublicDocumentForUser("user-2", "doc-1");

    expect(selection).toEqual({ id: "selection-1", userId: "user-2", documentId: "doc-1" });
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { userId_documentId: { userId: "user-2", documentId: "doc-1" } },
      create: { userId: "user-2", documentId: "doc-1" },
      update: {},
    });
  });

  it.each([
    ["own document", { id: "doc-1", ownerUserId: "user-2", visibility: "public", status: "indexed" }],
    ["private document", { id: "doc-1", ownerUserId: "user-1", visibility: "private", status: "indexed" }],
    ["unindexed document", { id: "doc-1", ownerUserId: "user-1", visibility: "public", status: "pending" }],
  ])("does not select %s", async (_name, document) => {
    mockFindUnique.mockResolvedValue(document);

    const selection = await selectPublicDocumentForUser("user-2", "doc-1");

    expect(selection).toBeNull();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("removes a user's public document selection", async () => {
    mockDeleteMany.mockResolvedValue({ count: 1 });

    const result = await unselectPublicDocumentForUser("user-2", "doc-1");

    expect(result).toEqual({ count: 1 });
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { userId: "user-2", documentId: "doc-1" } });
  });
});
