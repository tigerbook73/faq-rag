import type { User } from "@supabase/supabase-js";
import { getApiUser, getBearerToken, hasBearerAuthHeader } from "./get-api-user";

function user(id = "user-1"): User {
  return {
    id,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

function requestWith(headers: Record<string, string> = {}) {
  return { headers: new Headers(headers) };
}

function authClient(getUser: jest.Mock) {
  return {
    auth: { getUser },
  };
}

describe("getBearerToken()", () => {
  it("extracts a bearer token case-insensitively", () => {
    expect(getBearerToken(new Headers({ authorization: "bearer test-token" }))).toBe("test-token");
  });

  it("returns null for missing or malformed authorization headers", () => {
    expect(getBearerToken(new Headers())).toBeNull();
    expect(getBearerToken(new Headers({ authorization: "Basic abc" }))).toBeNull();
    expect(getBearerToken(new Headers({ authorization: "Bearer " }))).toBeNull();
  });
});

describe("hasBearerAuthHeader()", () => {
  it("detects bearer-like authorization headers", () => {
    expect(hasBearerAuthHeader(new Headers({ authorization: "Bearer test-token" }))).toBe(true);
    expect(hasBearerAuthHeader(new Headers({ authorization: "Bearer " }))).toBe(true);
    expect(hasBearerAuthHeader(new Headers({ authorization: "Basic abc" }))).toBe(false);
  });
});

describe("getApiUser()", () => {
  it("validates bearer tokens before cookie auth", async () => {
    const getUser = jest.fn().mockResolvedValue({ data: { user: user("bearer-user") }, error: null });

    await expect(
      getApiUser(requestWith({ authorization: "Bearer access-token" }), {
        createClient: () => authClient(getUser),
      }),
    ).resolves.toMatchObject({ id: "bearer-user" });

    expect(getUser).toHaveBeenCalledTimes(1);
    expect(getUser).toHaveBeenCalledWith("access-token");
  });

  it("falls back to cookie auth when no bearer token is present", async () => {
    const getUser = jest.fn().mockResolvedValue({ data: { user: user("cookie-user") }, error: null });

    await expect(
      getApiUser(requestWith(), {
        createClient: () => authClient(getUser),
      }),
    ).resolves.toMatchObject({ id: "cookie-user" });

    expect(getUser).toHaveBeenCalledTimes(1);
    expect(getUser).toHaveBeenCalledWith();
  });

  it("rejects invalid bearer tokens without falling back to cookie auth", async () => {
    const getUser = jest.fn().mockResolvedValue({ data: { user: null }, error: new Error("invalid token") });

    await expect(
      getApiUser(requestWith({ authorization: "Bearer invalid-token" }), {
        createClient: () => authClient(getUser),
      }),
    ).resolves.toBeNull();

    expect(getUser).toHaveBeenCalledTimes(1);
    expect(getUser).toHaveBeenCalledWith("invalid-token");
  });

  it("rejects malformed bearer headers without falling back to cookie auth", async () => {
    const getUser = jest.fn();

    await expect(
      getApiUser(requestWith({ authorization: "Bearer " }), {
        createClient: () => authClient(getUser),
      }),
    ).resolves.toBeNull();

    expect(getUser).not.toHaveBeenCalled();
  });

  it("returns null when cookie auth fails", async () => {
    const getUser = jest.fn().mockResolvedValue({ data: { user: null }, error: new Error("no session") });

    await expect(
      getApiUser(requestWith(), {
        createClient: () => authClient(getUser),
      }),
    ).resolves.toBeNull();
  });
});
