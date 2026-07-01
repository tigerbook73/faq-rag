const mockFindUnique = jest.fn();
const mockDelete = jest.fn();
const mockDeleteUploadedFile = jest.fn();

jest.mock("@/lib/server/db/client", () => ({
  prisma: {
    document: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}));

jest.mock("@/lib/server/storage", () => ({
  deleteUploadedFile: (...args: unknown[]) => mockDeleteUploadedFile(...args),
}));

import { deleteDocument } from "./delete-document";

describe("deleteDocument", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes storage and then the document record", async () => {
    mockFindUnique.mockResolvedValue({ id: "doc-1", fileRef: "embed/doc-1/faq.md" });
    mockDeleteUploadedFile.mockResolvedValue(undefined);
    mockDelete.mockResolvedValue({ id: "doc-1" });

    const result = await deleteDocument("doc-1");

    expect(result).toEqual({ id: "doc-1" });
    expect(mockDeleteUploadedFile).toHaveBeenCalledWith("embed/doc-1/faq.md");
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "doc-1" } });
  });

  it("still deletes the database record when storage deletion fails", async () => {
    mockFindUnique.mockResolvedValue({ id: "doc-1", fileRef: "embed/doc-1/faq.md" });
    mockDeleteUploadedFile.mockRejectedValue(new Error("storage failed"));
    mockDelete.mockResolvedValue({ id: "doc-1" });

    const result = await deleteDocument("doc-1");

    expect(result).toEqual({ id: "doc-1" });
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "doc-1" } });
  });

  it("returns null when the document does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await deleteDocument("missing");

    expect(result).toBeNull();
    expect(mockDeleteUploadedFile).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
