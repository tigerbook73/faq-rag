const mockGetUser = jest.fn();
const mockFindUnique = jest.fn();

jest.mock("react", () => ({
  cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

jest.mock("@/lib/server/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

jest.mock("@/lib/server/db/client", () => ({
  prisma: {
    userProfile: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

import { AuthError } from "./errors";
import { getCurrentUser, getProfile, requireAdmin, requireUser } from "./helpers";

describe("auth helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@test.com" } },
      error: null,
    });
    mockFindUnique.mockResolvedValue({ id: "user-1", email: "user@test.com", role: "user" });
  });

  it("loads a business profile for the current Supabase user", async () => {
    await expect(getCurrentUser()).resolves.toEqual({ id: "user-1", email: "user@test.com", role: "user" });
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: "user-1" } });
  });

  it("returns null when there is no Supabase user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("rejects authenticated users without a business profile", async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(getProfile("user-1")).rejects.toMatchObject({
      message: "Authenticated user does not have a business profile",
      status: 403,
    });
  });

  it("requires an authenticated profile", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(requireUser()).rejects.toMatchObject({
      message: "Authentication required",
      status: 401,
    });
  });

  it("allows role=admin through requireUser", async () => {
    mockFindUnique.mockResolvedValue({ id: "admin-1", email: "admin@test.com", role: "admin" });

    await expect(requireUser()).resolves.toEqual({ id: "admin-1", email: "admin@test.com", role: "admin" });
  });

  it("requires admin role for requireAdmin", async () => {
    await expect(requireAdmin()).rejects.toBeInstanceOf(AuthError);
    await expect(requireAdmin()).rejects.toMatchObject({
      message: "Admin privileges required",
      status: 403,
    });

    mockFindUnique.mockResolvedValue({ id: "admin-1", email: "admin@test.com", role: "admin" });
    await expect(requireAdmin()).resolves.toEqual({ id: "admin-1", email: "admin@test.com", role: "admin" });
  });
});
