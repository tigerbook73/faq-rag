export const SIGNED_IN_HOME_PATH = "/chat/last";
export const ADMIN_ACCESS_DENIED_PATH = "/chat/last";

export type RouteAccess = "public-home" | "public-auth-enhanced" | "public-only" | "authenticated-only" | "admin-only";
type RouteMatch = "exact" | "prefix";
type SidebarPolicy = "always-hide" | "anonymous-hide" | "authenticated-allowed";

interface RoutePolicy {
  path: string;
  match: RouteMatch;
  access: RouteAccess;
  authProxyBypass: boolean;
  sidebar: SidebarPolicy;
}

const DEFAULT_ROUTE_POLICY: RoutePolicy = {
  path: "*",
  match: "prefix",
  access: "authenticated-only",
  authProxyBypass: false,
  sidebar: "authenticated-allowed",
};

const ROUTE_POLICIES: readonly RoutePolicy[] = [
  {
    path: "/",
    match: "exact",
    access: "public-home",
    authProxyBypass: true,
    sidebar: "always-hide",
  },
  {
    path: "/about",
    match: "exact",
    access: "public-auth-enhanced",
    authProxyBypass: true,
    sidebar: "anonymous-hide",
  },
  {
    path: "/auth/signin",
    match: "prefix",
    access: "public-only",
    authProxyBypass: true,
    sidebar: "always-hide",
  },
  {
    path: "/chat",
    match: "prefix",
    access: "authenticated-only",
    authProxyBypass: false,
    sidebar: "authenticated-allowed",
  },
  {
    path: "/knowledge",
    match: "prefix",
    access: "authenticated-only",
    authProxyBypass: false,
    sidebar: "authenticated-allowed",
  },
  {
    path: "/admin",
    match: "prefix",
    access: "admin-only",
    authProxyBypass: false,
    sidebar: "authenticated-allowed",
  },
  {
    path: "/api/ingest-hook",
    match: "prefix",
    access: "public-only",
    authProxyBypass: true,
    sidebar: "always-hide",
  },
];

function matchesPathPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function matchesRoutePolicy(pathname: string, policy: RoutePolicy) {
  if (policy.match === "exact") return pathname === policy.path;
  return matchesPathPrefix(pathname, policy.path);
}

export function findRoutePolicy(pathname: string): RoutePolicy {
  return ROUTE_POLICIES.find((policy) => matchesRoutePolicy(pathname, policy)) ?? DEFAULT_ROUTE_POLICY;
}

export function getRouteAccess(pathname: string): RouteAccess {
  return findRoutePolicy(pathname).access;
}

export function canBypassAuthProxy(pathname: string) {
  return findRoutePolicy(pathname).authProxyBypass;
}

export function isSidebarlessRoute(pathname: string) {
  return findRoutePolicy(pathname).sidebar === "always-hide";
}

export function shouldHideSidebar(pathname: string, isAuthenticated: boolean) {
  const policy = findRoutePolicy(pathname);
  if (policy.sidebar === "always-hide") return true;
  if (policy.sidebar === "anonymous-hide") return !isAuthenticated;
  return false;
}

export function isSignInRoute(pathname: string) {
  return findRoutePolicy(pathname).access === "public-only" && matchesPathPrefix(pathname, "/auth/signin");
}

export function isAdminRoute(pathname: string) {
  return findRoutePolicy(pathname).access === "admin-only";
}

export function buildCurrentPath(pathname: string, search = "") {
  return `${pathname}${search}`;
}

export function sanitizeRedirectPath(from: string | null | undefined, fallback = SIGNED_IN_HOME_PATH) {
  if (!from) return fallback;
  if (!from.startsWith("/") || from.startsWith("//")) return fallback;

  let url: URL;
  try {
    url = new URL(from, "http://app.local");
  } catch {
    return fallback;
  }

  if (url.origin !== "http://app.local") return fallback;
  if (isSignInRoute(url.pathname)) return fallback;

  return `${url.pathname}${url.search}${url.hash}`;
}
