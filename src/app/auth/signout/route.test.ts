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

jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      signOut: mockSignOut,
    },
  }),
}));

import { GET } from "./route";

describe("/auth/signout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    mockSignOut.mockResolvedValue(undefined);
  });

  it("signs out and redirects to sign-in", async () => {
    const res = await GET();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/auth/signin");
  });
});
