const mockSignOut = jest.fn();

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn((_url, _key, options) => {
    options.cookies.setAll([{ name: "sb-test-auth-token", value: "", options: { path: "/", maxAge: 0 } }]);
    return {
      auth: {
        signOut: mockSignOut,
      },
    };
  }),
}));

jest.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [],
  }),
}));

import { POST } from "./route";

describe("/api/auth/signout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignOut.mockResolvedValue(undefined);
  });

  it("signs out with POST and clears auth cookies", async () => {
    const res = await POST();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("set-cookie")).toContain("sb-test-auth-token=");
    expect(await res.json()).toEqual({ ok: true });
  });
});
