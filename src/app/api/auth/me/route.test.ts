const mockRequireUser = jest.fn();

jest.mock("@/lib/server/auth/require-user", () => ({
  requireUser: () => mockRequireUser(),
}));

import { GET } from "./route";
import { AuthError } from "@/lib/server/auth/errors";

describe("/api/auth/me", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the current auth state including role", async () => {
    mockRequireUser.mockResolvedValue({ id: "user-1", email: "user@test.com", role: "admin" });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "user-1", email: "user@test.com", role: "admin" });
  });

  it("returns auth errors from requireUser", async () => {
    mockRequireUser.mockRejectedValue(new AuthError("Authentication required", 401));

    const res = await GET();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Authentication required" });
  });
});
