import {
  ADMIN_ACCESS_DENIED_PATH,
  SIGNED_IN_HOME_PATH,
  buildCurrentPath,
  canBypassAuthProxy,
  findRoutePolicy,
  getRouteAccess,
  isAdminRoute,
  sanitizeRedirectPath,
  shouldHideSidebar,
} from "./route-policy";

describe("route-policy", () => {
  describe("findRoutePolicy", () => {
    it("returns route metadata from the policy table", () => {
      expect(findRoutePolicy("/about")).toMatchObject({
        path: "/about",
        access: "public-auth-enhanced",
        authProxyBypass: true,
        sidebar: "anonymous-hide",
      });
      expect(findRoutePolicy("/unknown")).toMatchObject({
        path: "*",
        access: "authenticated-only",
        authProxyBypass: false,
        sidebar: "authenticated-allowed",
      });
    });
  });

  describe("getRouteAccess", () => {
    it("classifies public and protected routes", () => {
      expect(getRouteAccess("/")).toBe("public-home");
      expect(getRouteAccess("/about")).toBe("public-auth-enhanced");
      expect(getRouteAccess("/auth/signin")).toBe("public-only");
      expect(getRouteAccess("/chat")).toBe("authenticated-only");
      expect(getRouteAccess("/chat/last")).toBe("authenticated-only");
      expect(getRouteAccess("/knowledge")).toBe("authenticated-only");
      expect(getRouteAccess("/knowledge/documents")).toBe("authenticated-only");
      expect(getRouteAccess("/admin")).toBe("admin-only");
      expect(getRouteAccess("/admin/users")).toBe("admin-only");
    });
  });

  describe("canBypassAuthProxy", () => {
    it("allows only public exact routes and explicit bypass prefixes", () => {
      expect(canBypassAuthProxy("/")).toBe(true);
      expect(canBypassAuthProxy("/about")).toBe(true);
      expect(canBypassAuthProxy("/auth/signin")).toBe(true);
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
  });

  describe("redirect targets", () => {
    it("preserves safe app paths", () => {
      expect(sanitizeRedirectPath("/chat/last")).toBe("/chat/last");
      expect(sanitizeRedirectPath("/knowledge?tab=public#top")).toBe("/knowledge?tab=public#top");
    });

    it("falls back for unsafe or looping targets", () => {
      expect(sanitizeRedirectPath(undefined)).toBe(SIGNED_IN_HOME_PATH);
      expect(sanitizeRedirectPath(null)).toBe(SIGNED_IN_HOME_PATH);
      expect(sanitizeRedirectPath("https://example.com/chat")).toBe(SIGNED_IN_HOME_PATH);
      expect(sanitizeRedirectPath("//example.com/chat")).toBe(SIGNED_IN_HOME_PATH);
      expect(sanitizeRedirectPath("chat/last")).toBe(SIGNED_IN_HOME_PATH);
      expect(sanitizeRedirectPath("/auth/signin")).toBe(SIGNED_IN_HOME_PATH);
      expect(sanitizeRedirectPath("/auth/signin/")).toBe(SIGNED_IN_HOME_PATH);
      expect(sanitizeRedirectPath("/auth/signin?from=/chat")).toBe(SIGNED_IN_HOME_PATH);
    });

    it("allows caller supplied fallback", () => {
      expect(sanitizeRedirectPath("/auth/signin", ADMIN_ACCESS_DENIED_PATH)).toBe(ADMIN_ACCESS_DENIED_PATH);
    });

    it("builds current path with search params", () => {
      expect(buildCurrentPath("/knowledge", "?tab=public")).toBe("/knowledge?tab=public");
      expect(buildCurrentPath("/admin")).toBe("/admin");
    });
  });
});
