const mockSignInWithPassword = jest.fn();
const mockSetSession = jest.fn();
const mockSignOut = jest.fn();
const mockGetProfile = jest.fn();

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  })),
}));

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn((_url, _key, options) => {
    options.cookies.setAll([{ name: "sb-test-auth-token", value: "token", options: { path: "/" } }]);
    return {
      auth: {
        setSession: mockSetSession,
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
      setSession: mockSetSession,
      signOut: mockSignOut,
    },
  }),
}));

jest.mock("@/lib/auth/helpers", () => ({
  getProfile: (...args: unknown[]) => mockGetProfile(...args),
}));

import { POST } from "./route";
import { AuthError } from "@/lib/auth/errors";

function request(body: unknown) {
  return new Request("http://localhost/api/auth/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/auth/signin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SUPABASE_URL = "http://supabase.test";
    process.env.SUPABASE_ANON_KEY = "anon-key";
    mockSignInWithPassword.mockResolvedValue({
      data: {
        user: { id: "user-1" },
        session: { access_token: "access-token", refresh_token: "refresh-token" },
      },
      error: null,
    });
    mockGetProfile.mockResolvedValue({ id: "user-1", email: "user@test.com", role: "user" });
    mockSetSession.mockResolvedValue({ error: null });
  });

  it("signs in a user and returns the user home redirect", async () => {
    const res = await POST(request({ email: "user@test.com", password: "secret123" }));

    expect(res.status).toBe(200);
    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: "user@test.com", password: "secret123" });
    expect(mockGetProfile).toHaveBeenCalledWith("user-1");
    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: "access-token",
      refresh_token: "refresh-token",
    });
    expect(await res.json()).toEqual({ redirectTo: "/chat/last" });
  });

  it("returns admin home for admin users without from", async () => {
    mockGetProfile.mockResolvedValue({ id: "admin-1", email: "admin@test.com", role: "admin" });

    const res = await POST(request({ email: "admin@test.com", password: "secret123" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ redirectTo: "/admin" });
  });

  it("uses from only when the role can access it", async () => {
    let res = await POST(request({ email: "user@test.com", password: "secret123", from: "/admin/users" }));
    expect(await res.json()).toEqual({ redirectTo: "/chat/last" });

    mockGetProfile.mockResolvedValue({ id: "admin-1", email: "admin@test.com", role: "admin" });
    res = await POST(request({ email: "admin@test.com", password: "secret123", from: "/admin/users" }));
    expect(await res.json()).toEqual({ redirectTo: "/admin/users" });
  });

  it("rejects invalid credentials", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    });

    const res = await POST(request({ email: "user@test.com", password: "wrong" }));

    expect(res.status).toBe(401);
    expect(mockGetProfile).not.toHaveBeenCalled();
    expect(mockSetSession).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ error: "Invalid login credentials" });
  });

  it("rejects authenticated users without a profile before setting session", async () => {
    mockGetProfile.mockRejectedValue(new AuthError("Authenticated user does not have a business profile", 403));

    const res = await POST(request({ email: "user@test.com", password: "secret123" }));

    expect(res.status).toBe(403);
    expect(mockSetSession).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ error: "Authenticated user does not have a business profile" });
  });

  it("cleans up when setting the session fails", async () => {
    mockSetSession.mockResolvedValue({ error: { message: "bad token" } });

    const res = await POST(request({ email: "user@test.com", password: "secret123" }));

    expect(res.status).toBe(401);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(await res.json()).toEqual({ error: "Unable to create session" });
  });

  it("rejects invalid request bodies", async () => {
    const res = await POST(request({ email: "not-email", password: "" }));

    expect(res.status).toBe(400);
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });
});
