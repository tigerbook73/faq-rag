const mockFindUnique = jest.fn();
const mockDeleteProfile = jest.fn();
const mockDeleteUploadedFile = jest.fn();
const mockDeleteAuthUser = jest.fn();

jest.mock("@/lib/server/db/client", () => ({
  prisma: {
    userProfile: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      delete: (...args: unknown[]) => mockDeleteProfile(...args),
    },
  },
}));

jest.mock("@/lib/server/storage", () => ({
  deleteUploadedFile: (...args: unknown[]) => mockDeleteUploadedFile(...args),
}));

jest.mock("@/lib/server/supabase/server", () => ({
  createSupabaseServiceClient: () => ({
    auth: {
      admin: {
        deleteUser: (...args: unknown[]) => mockDeleteAuthUser(...args),
      },
    },
  }),
}));

import { deleteUserAccount } from "./delete-user";

describe("deleteUserAccount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteUploadedFile.mockResolvedValue(undefined);
    mockDeleteAuthUser.mockResolvedValue({ error: null });
  });

  it("deletes the profile, user document files, and Supabase auth user", async () => {
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      documents: [
        { id: "doc-1", fileRef: "embed/doc-1/faq.md" },
        { id: "doc-2", fileRef: null },
      ],
    });
    mockDeleteProfile.mockResolvedValue({ id: "user-1" });

    const result = await deleteUserAccount("user-1");

    expect(result).toEqual({
      id: "user-1",
      documents: [
        { id: "doc-1", fileRef: "embed/doc-1/faq.md" },
        { id: "doc-2", fileRef: null },
      ],
    });
    expect(mockDeleteProfile).toHaveBeenCalledWith({ where: { id: "user-1" } });
    expect(mockDeleteUploadedFile).toHaveBeenCalledWith("embed/doc-1/faq.md");
    expect(mockDeleteAuthUser).toHaveBeenCalledWith("user-1");
  });

  it("continues when storage deletion fails", async () => {
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      documents: [{ id: "doc-1", fileRef: "embed/doc-1/faq.md" }],
    });
    mockDeleteProfile.mockResolvedValue({ id: "user-1" });
    mockDeleteUploadedFile.mockRejectedValue(new Error("storage failed"));

    const result = await deleteUserAccount("user-1");

    expect(result?.id).toBe("user-1");
    expect(mockDeleteAuthUser).toHaveBeenCalledWith("user-1");
  });

  it("returns null when the profile does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await deleteUserAccount("missing");

    expect(result).toBeNull();
    expect(mockDeleteProfile).not.toHaveBeenCalled();
    expect(mockDeleteAuthUser).not.toHaveBeenCalled();
  });
});
