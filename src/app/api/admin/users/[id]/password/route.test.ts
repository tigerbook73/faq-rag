const mockRequireAdmin = jest.fn();
const mockUpdateUserPassword = jest.fn();

jest.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

jest.mock("@/lib/services/update-user-password", () => ({
  updateUserPassword: (...args: unknown[]) => mockUpdateUserPassword(...args),
}));

import { PATCH } from "./route";
import { AuthError } from "@/lib/auth/errors";

function patchRequest(id: string, body: unknown) {
  return new Request(`http://localhost/api/admin/users/${id}/password`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("PATCH /api/admin/users/[id]/password", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ id: "admin-1", role: "admin" });
  });

  it("updates password and returns 204", async () => {
    mockUpdateUserPassword.mockResolvedValue({ found: true });

    const res = await PATCH(patchRequest("user-1", { password: "newpass1" }) as never, makeParams("user-1"));

    expect(res.status).toBe(204);
    expect(mockUpdateUserPassword).toHaveBeenCalledWith("user-1", "newpass1");
  });

  it("returns 404 when user not found", async () => {
    mockUpdateUserPassword.mockResolvedValue({ found: false });

    const res = await PATCH(patchRequest("missing", { password: "newpass1" }) as never, makeParams("missing"));

    expect(res.status).toBe(404);
  });

  it("returns 400 when password is too short", async () => {
    const res = await PATCH(patchRequest("user-1", { password: "abc" }) as never, makeParams("user-1"));

    expect(res.status).toBe(400);
    expect(mockUpdateUserPassword).not.toHaveBeenCalled();
  });

  it("returns 403 for non-admin", async () => {
    mockRequireAdmin.mockRejectedValue(new AuthError("Admin privileges required", 403));

    const res = await PATCH(patchRequest("user-1", { password: "newpass1" }) as never, makeParams("user-1"));

    expect(res.status).toBe(403);
    expect(mockUpdateUserPassword).not.toHaveBeenCalled();
  });
});
