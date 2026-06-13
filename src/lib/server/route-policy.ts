export const HOME_PATH = "/chat/last";

type RouteMatch = "exact" | "prefix";

interface RoutePolicy {
  path: string;
  match: RouteMatch;
  hideSidebar: boolean;
}

const DEFAULT_ROUTE_POLICY: RoutePolicy = {
  path: "*",
  match: "prefix",
  hideSidebar: false,
};

const ROUTE_POLICIES: readonly RoutePolicy[] = [
  { path: "/", match: "exact", hideSidebar: true },
  { path: "/api", match: "prefix", hideSidebar: true },
];

function matchesPathPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function matchesRoutePolicy(pathname: string, policy: RoutePolicy) {
  if (policy.match === "exact") return pathname === policy.path;
  return matchesPathPrefix(pathname, policy.path);
}

function findRoutePolicy(pathname: string): RoutePolicy {
  return ROUTE_POLICIES.find((policy) => matchesRoutePolicy(pathname, policy)) ?? DEFAULT_ROUTE_POLICY;
}

export function isSidebarlessRoute(pathname: string) {
  return findRoutePolicy(pathname).hideSidebar;
}
