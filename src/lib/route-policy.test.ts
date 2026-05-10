import {
  ADMIN_ACCESS_DENIED_PATH,
  ADMIN_HOME_PATH,
  SIGN_IN_PATH,
  SIGN_OUT_PATH,
  USER_HOME_PATH,
  buildCurrentPath,
  canBypassAuthProxy,
  findRoutePolicy,
  getRouteAccess,
  isAdminApiRoute,
  isAdminPrivateRoute,
  isAdminRoute,
  isUserApiRoute,
  isUserPrivateRoute,
  resolvePostLoginRedirect,
  sanitizeRedirectPath,
  shouldHideSidebar,
} from "./route-policy";

describe("route-policy", () => {
  describe("findRoutePolicy", () => {
    it("returns route metadata from the policy table", () => {
      expect(findRoutePolicy("/about")).toMatchObject({
        path: "/about",
        access: "public",
        authProxyBypass: true,
        sidebar: "anonymous-hide",
      });
      expect(findRoutePolicy("/unknown")).toMatchObject({
        path: "*",
        access: "user-private",
        authProxyBypass: false,
        sidebar: "authenticated-allowed",
      });
    });
  });

  describe("getRouteAccess", () => {
    it("classifies public and protected routes", () => {
      expect(getRouteAccess("/")).toBe("public");
      expect(getRouteAccess("/about")).toBe("public");
      expect(getRouteAccess(SIGN_IN_PATH)).toBe("sign-in");
      expect(getRouteAccess(SIGN_OUT_PATH)).toBe("public");
      expect(getRouteAccess("/chat")).toBe("user-private");
      expect(getRouteAccess("/chat/last")).toBe("user-private");
      expect(getRouteAccess("/knowledge")).toBe("user-private");
      expect(getRouteAccess("/knowledge/documents")).toBe("user-private");
      expect(getRouteAccess("/admin")).toBe("admin-private");
      expect(getRouteAccess("/admin/users")).toBe("admin-private");
    });

    it("classifies API routes", () => {
      expect(getRouteAccess("/api/health")).toBe("public-api");
      expect(getRouteAccess("/api/auth/signin")).toBe("public-api");
      expect(getRouteAccess("/api/auth/me")).toBe("public-api");
      expect(getRouteAccess("/api/ingest-hook")).toBe("public-api");
      expect(getRouteAccess("/api/chat")).toBe("user-api");
      expect(getRouteAccess("/api/documents/123")).toBe("user-api");
      expect(getRouteAccess("/api/sessions/123")).toBe("user-api");
      expect(getRouteAccess("/api/public-documents/123")).toBe("user-api");
      expect(getRouteAccess("/api/admin/users")).toBe("admin-api");
    });
  });

  describe("canBypassAuthProxy", () => {
    it("allows only public exact routes and explicit bypass prefixes", () => {
      expect(canBypassAuthProxy("/")).toBe(true);
      expect(canBypassAuthProxy("/about")).toBe(true);
      expect(canBypassAuthProxy("/auth/signin")).toBe(true);
      expect(canBypassAuthProxy("/auth/signout")).toBe(true);
      expect(canBypassAuthProxy("/api/health")).toBe(true);
      expect(canBypassAuthProxy("/api/auth/signin")).toBe(true);
      expect(canBypassAuthProxy("/api/auth/me")).toBe(true);
      expect(canBypassAuthProxy("/api/ingest-hook")).toBe(true);
      expect(canBypassAuthProxy("/api/ingest-hook/supabase")).toBe(true);

      expect(canBypassAuthProxy("/chat")).toBe(false);
      expect(canBypassAuthProxy("/knowledge")).toBe(false);
      expect(canBypassAuthProxy("/admin")).toBe(false);
      expect(canBypassAuthProxy("/about/team")).toBe(false);
      expect(canBypassAuthProxy("/api/ingest-hook-anything")).toBe(false);
    });
  });

  describe("sidebar visibility", () => {
    it("hides sidebar on anonymous public pages and sign-in", () => {
      expect(shouldHideSidebar("/", false)).toBe(true);
      expect(shouldHideSidebar("/about", false)).toBe(true);
      expect(shouldHideSidebar("/auth/signin", false)).toBe(true);
      expect(shouldHideSidebar("/chat", false)).toBe(false);
    });

    it("allows sidebar on signed-in public-auth-enhanced pages", () => {
      expect(shouldHideSidebar("/about", true)).toBe(false);
      expect(shouldHideSidebar("/", true)).toBe(true);
      expect(shouldHideSidebar("/auth/signin", true)).toBe(true);
    });
  });

  describe("admin route detection", () => {
    it("matches admin route boundaries", () => {
      expect(isAdminRoute("/admin")).toBe(true);
      expect(isAdminRoute("/admin/users")).toBe(true);
      expect(isAdminRoute("/administrator")).toBe(false);
    });

    it("detects private page and API route classes", () => {
      expect(isUserPrivateRoute("/chat/last")).toBe(true);
      expect(isUserPrivateRoute("/about")).toBe(false);
      expect(isAdminPrivateRoute("/admin/documents")).toBe(true);
      expect(isAdminPrivateRoute("/api/admin/documents")).toBe(false);
      expect(isUserApiRoute("/api/documents/123")).toBe(true);
      expect(isUserApiRoute("/api/admin/users")).toBe(false);
      expect(isAdminApiRoute("/api/admin/users")).toBe(true);
      expect(isAdminApiRoute("/admin/users")).toBe(false);
    });
  });

  describe("redirect targets", () => {
    it("preserves safe app paths", () => {
      expect(sanitizeRedirectPath("/chat/last")).toBe("/chat/last");
      expect(sanitizeRedirectPath("/knowledge?tab=public#top")).toBe("/knowledge?tab=public#top");
      expect(sanitizeRedirectPath("/admin/users?tab=active")).toBe("/admin/users?tab=active");
    });

    it("falls back for unsafe or looping targets", () => {
      expect(sanitizeRedirectPath(undefined)).toBe(USER_HOME_PATH);
      expect(sanitizeRedirectPath(null)).toBe(USER_HOME_PATH);
      expect(sanitizeRedirectPath("https://example.com/chat")).toBe(USER_HOME_PATH);
      expect(sanitizeRedirectPath("//example.com/chat")).toBe(USER_HOME_PATH);
      expect(sanitizeRedirectPath("chat/last")).toBe(USER_HOME_PATH);
      expect(sanitizeRedirectPath("/auth/signin")).toBe(USER_HOME_PATH);
      expect(sanitizeRedirectPath("/auth/signin/")).toBe(USER_HOME_PATH);
      expect(sanitizeRedirectPath("/auth/signin?from=/chat")).toBe(USER_HOME_PATH);
      expect(sanitizeRedirectPath("/auth/signout")).toBe(USER_HOME_PATH);
      expect(sanitizeRedirectPath("/api/chat")).toBe(USER_HOME_PATH);
      expect(sanitizeRedirectPath("/_next/static/chunk.js")).toBe(USER_HOME_PATH);
      expect(sanitizeRedirectPath("/favicon.ico")).toBe(USER_HOME_PATH);
      expect(sanitizeRedirectPath("/unknown")).toBe(USER_HOME_PATH);
    });

    it("allows caller supplied fallback", () => {
      expect(sanitizeRedirectPath("/auth/signin", ADMIN_ACCESS_DENIED_PATH)).toBe(ADMIN_ACCESS_DENIED_PATH);
    });

    it("resolves post-login redirects by role", () => {
      expect(resolvePostLoginRedirect("user", null)).toBe(USER_HOME_PATH);
      expect(resolvePostLoginRedirect("admin", null)).toBe(ADMIN_HOME_PATH);
      expect(resolvePostLoginRedirect("user", "/chat/last")).toBe("/chat/last");
      expect(resolvePostLoginRedirect("admin", "/chat/last")).toBe("/chat/last");
      expect(resolvePostLoginRedirect("admin", "/admin/users")).toBe("/admin/users");
      expect(resolvePostLoginRedirect("user", "/admin/users")).toBe(USER_HOME_PATH);
      expect(resolvePostLoginRedirect("admin", "/api/admin/users")).toBe(ADMIN_HOME_PATH);
      expect(resolvePostLoginRedirect("user", "https://example.com/admin")).toBe(USER_HOME_PATH);
    });

    it("builds current path with search params", () => {
      expect(buildCurrentPath("/knowledge", "?tab=public")).toBe("/knowledge?tab=public");
      expect(buildCurrentPath("/admin")).toBe("/admin");
    });
  });
});
