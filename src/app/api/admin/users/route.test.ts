const mockRequireAdmin = jest.fn();
const mockListUsers = jest.fn();
const mockCreateUserAccount = jest.fn();

jest.mock("@/lib/server/auth/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

jest.mock("@/lib/server/data/users", () => ({
  listUsers: (...args: unknown[]) => mockListUsers(...args),
}));

jest.mock("@/lib/server/services/create-user", () => ({
  createUserAccount: (...args: unknown[]) => mockCreateUserAccount(...args),
}));

import { GET, POST } from "./route";
import { AuthError } from "@/lib/server/auth/errors";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/users", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ id: "admin-1", role: "admin" });
  });

  it("requires admin and lists users", async () => {
    mockListUsers.mockResolvedValue([{ id: "user-1", email: "user1@test.com" }]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(mockRequireAdmin).toHaveBeenCalledTimes(1);
    expect(mockListUsers).toHaveBeenCalledTimes(1);
    expect(await res.json()).toEqual({ items: [{ id: "user-1", email: "user1@test.com" }] });
  });

  it("rejects non-admin users", async () => {
    mockRequireAdmin.mockRejectedValue(new AuthError("Admin privileges required", 403));

    const res = await GET();

    expect(res.status).toBe(403);
    expect(mockListUsers).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ error: "Admin privileges required" });
  });

  it("creates users through the user service", async () => {
    mockCreateUserAccount.mockResolvedValue({ id: "user-1", email: "new@test.com", role: "user" });

    const res = await POST(jsonRequest({ email: "new@test.com", password: "secret123" }) as never);

    expect(res.status).toBe(201);
    expect(mockCreateUserAccount).toHaveBeenCalledWith({ email: "new@test.com", password: "secret123", role: "user" });
    expect(await res.json()).toEqual({ id: "user-1", email: "new@test.com", role: "user" });
  });

  it("always creates users with role=user even if role=admin is sent", async () => {
    mockCreateUserAccount.mockResolvedValue({ id: "user-1", email: "new@test.com", role: "user" });

    const res = await POST(jsonRequest({ email: "new@test.com", password: "secret123", role: "admin" }) as never);

    expect(res.status).toBe(201);
    expect(mockCreateUserAccount).toHaveBeenCalledWith({ email: "new@test.com", password: "secret123", role: "user" });
  });

  it("rejects password shorter than 6 characters", async () => {
    const res = await POST(jsonRequest({ email: "new@test.com", password: "abc" }) as never);

    expect(res.status).toBe(400);
    expect(mockCreateUserAccount).not.toHaveBeenCalled();
  });
});
