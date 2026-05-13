const mockRequireAdmin = jest.fn();
const mockDeleteUserAccount = jest.fn();

jest.mock("@/lib/server/auth/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

jest.mock("@/lib/server/services/delete-user", () => ({
  deleteUserAccount: (...args: unknown[]) => mockDeleteUserAccount(...args),
}));

import { DELETE } from "./route";

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("/api/admin/users/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ id: "admin-1", role: "admin" });
  });

  it("prevents admins from deleting their own account", async () => {
    const res = await DELETE(new Request("http://localhost/api/admin/users/admin-1") as never, params("admin-1"));

    expect(res.status).toBe(400);
    expect(mockDeleteUserAccount).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ error: "Admin cannot delete their own account" });
  });

  it("deletes another user through the user deletion service", async () => {
    mockDeleteUserAccount.mockResolvedValue({ id: "user-1", email: "user1@test.com" });

    const res = await DELETE(new Request("http://localhost/api/admin/users/user-1") as never, params("user-1"));

    expect(res.status).toBe(204);
    expect(mockDeleteUserAccount).toHaveBeenCalledWith("user-1");
  });

  it("returns 404 when the user does not exist", async () => {
    mockDeleteUserAccount.mockResolvedValue(null);

    const res = await DELETE(new Request("http://localhost/api/admin/users/missing") as never, params("missing"));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });
});
