export const SIGN_IN_PATH = "/auth/signin";
export const SIGN_OUT_PATH = "/auth/signout";
export const USER_HOME_PATH = "/chat/last";
export const ADMIN_HOME_PATH = "/admin";
export const SIGNED_IN_HOME_PATH = USER_HOME_PATH;
export const ADMIN_ACCESS_DENIED_PATH = USER_HOME_PATH;

export type UserRole = "user" | "admin";
export type RouteAccess =
  | "public"
  | "sign-in"
  | "user-private"
  | "admin-private"
  | "public-api"
  | "user-api"
  | "admin-api";
type RouteMatch = "exact" | "prefix";
type SidebarPolicy = "always-hide" | "anonymous-hide" | "authenticated-allowed";

export interface RoutePolicy {
  path: string;
  match: RouteMatch;
  access: RouteAccess;
  authProxyBypass: boolean;
  sidebar: SidebarPolicy;
}

const DEFAULT_ROUTE_POLICY: RoutePolicy = {
  path: "*",
  match: "prefix",
  access: "user-private",
  authProxyBypass: false,
  sidebar: "authenticated-allowed",
};

const ROUTE_POLICIES: readonly RoutePolicy[] = [
  {
    path: "/",
    match: "exact",
    access: "public",
    authProxyBypass: true,
    sidebar: "always-hide",
  },
  {
    path: "/about",
    match: "exact",
    access: "public",
    authProxyBypass: true,
    sidebar: "anonymous-hide",
  },
  {
    path: SIGN_IN_PATH,
    match: "prefix",
    access: "sign-in",
    authProxyBypass: true,
    sidebar: "always-hide",
  },
  {
    path: SIGN_OUT_PATH,
    match: "exact",
    access: "public",
    authProxyBypass: true,
    sidebar: "always-hide",
  },
  {
    path: "/chat",
    match: "prefix",
    access: "user-private",
    authProxyBypass: false,
    sidebar: "authenticated-allowed",
  },
  {
    path: "/knowledge",
    match: "prefix",
    access: "user-private",
    authProxyBypass: false,
    sidebar: "authenticated-allowed",
  },
  {
    path: "/admin",
    match: "prefix",
    access: "admin-private",
    authProxyBypass: false,
    sidebar: "authenticated-allowed",
  },
  {
    path: "/api/admin",
    match: "prefix",
    access: "admin-api",
    authProxyBypass: false,
    sidebar: "always-hide",
  },
  {
    path: "/api/chat",
    match: "exact",
    access: "user-api",
    authProxyBypass: false,
    sidebar: "always-hide",
  },
  {
    path: "/api/documents",
    match: "prefix",
    access: "user-api",
    authProxyBypass: false,
    sidebar: "always-hide",
  },
  {
    path: "/api/sessions",
    match: "prefix",
    access: "user-api",
    authProxyBypass: false,
    sidebar: "always-hide",
  },
  {
    path: "/api/public-documents",
    match: "prefix",
    access: "user-api",
    authProxyBypass: false,
    sidebar: "always-hide",
  },
  {
    path: "/api/health",
    match: "exact",
    access: "public-api",
    authProxyBypass: true,
    sidebar: "always-hide",
  },
  {
    path: "/api/ingest-hook",
    match: "prefix",
    access: "public-api",
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

export const getRoutePolicy = findRoutePolicy;

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
  return findRoutePolicy(pathname).access === "sign-in" && matchesPathPrefix(pathname, SIGN_IN_PATH);
}

export function isAdminRoute(pathname: string) {
  return findRoutePolicy(pathname).access === "admin-private";
}

export function isUserPrivateRoute(pathname: string) {
  return findRoutePolicy(pathname).access === "user-private";
}

export function isAdminPrivateRoute(pathname: string) {
  return findRoutePolicy(pathname).access === "admin-private";
}

export function isUserApiRoute(pathname: string) {
  return findRoutePolicy(pathname).access === "user-api";
}

export function isAdminApiRoute(pathname: string) {
  return findRoutePolicy(pathname).access === "admin-api";
}

export function shouldHideUserShell(pathname: string, isAuthenticated: boolean) {
  return shouldHideSidebar(pathname, isAuthenticated);
}

export function buildCurrentPath(pathname: string, search = "") {
  return `${pathname}${search}`;
}

function isRecognizedPageRoute(pathname: string) {
  const policy = findRoutePolicy(pathname);
  return policy !== DEFAULT_ROUTE_POLICY && !policy.access.endsWith("-api");
}

export function sanitizeRedirectPath(from: string | null | undefined, fallback = USER_HOME_PATH) {
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
  if (url.pathname === SIGN_OUT_PATH) return fallback;
  if (url.pathname === "/api" || matchesPathPrefix(url.pathname, "/api")) return fallback;
  if (url.pathname === "/_next" || matchesPathPrefix(url.pathname, "/_next")) return fallback;
  if (!isRecognizedPageRoute(url.pathname)) return fallback;

  return `${url.pathname}${url.search}${url.hash}`;
}

export function resolvePostLoginRedirect(role: UserRole, from: string | null | undefined) {
  const homePath = role === "admin" ? ADMIN_HOME_PATH : USER_HOME_PATH;
  const redirectPath = sanitizeRedirectPath(from, homePath);
  const redirectUrl = new URL(redirectPath, "http://app.local");

  if (role !== "admin" && isAdminPrivateRoute(redirectUrl.pathname)) {
    return homePath;
  }

  return redirectPath;
}
