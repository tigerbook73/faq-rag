import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { preventAuthResponseCaching } from "@/lib/server/auth/api";
import {
  buildCurrentPath,
  canBypassAuthProxy,
  isSignInRoute,
  resolvePostLoginRedirect,
} from "@/lib/server/route-policy";

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isSignIn = isSignInRoute(pathname);

  const { createServerClient } = await import("@supabase/ssr");

  // Strip spoofable auth-identity headers from the incoming client request.
  const reqHeaders = new Headers(req.headers);
  reqHeaders.delete("x-auth-id");
  reqHeaders.delete("x-auth-email");

  // Collect cookies refreshed during getUser() to apply on any response.
  const refreshedCookies: Array<{ name: string; value: string; options: object }> = [];

  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        refreshedCookies.push(...cookiesToSet.map(({ name, value, options }) => ({ name, value, options })));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /** Apply any token-refresh cookies to a response without modifying its redirect semantics. */
  function withRefreshedCookies(res: NextResponse) {
    refreshedCookies.forEach(({ name, value, options }) =>
      res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]),
    );
    return preventAuthResponseCaching(res);
  }

  /**
   * Build a pass-through NextResponse with verified auth headers injected so Server Components
   * can read the authenticated user without calling getUser() again.
   */
  function buildPassthrough(): NextResponse {
    // Forward the (potentially refreshed) cookie values so Server Components see the new token.
    const cookieHeader = req.cookies
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    if (cookieHeader) reqHeaders.set("cookie", cookieHeader);

    if (user) {
      reqHeaders.set("x-auth-id", user.id);
      reqHeaders.set("x-auth-email", user.email ?? "");
    }

    const res = NextResponse.next({ request: { headers: reqHeaders } });
    return withRefreshedCookies(res);
  }

  if (isSignIn) {
    if (!user) return buildPassthrough();

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (error || (profile?.role !== "admin" && profile?.role !== "user")) {
      return buildPassthrough();
    }

    const redirectUrl = new URL(resolvePostLoginRedirect(profile.role, req.nextUrl.searchParams.get("from")), req.url);
    return withRefreshedCookies(NextResponse.redirect(redirectUrl));
  }

  // Root path redirect replaces page.tsx — no getUser() needed in the page component.
  if (pathname === "/") {
    const target = user ? "/chat/last" : "/about";
    return withRefreshedCookies(NextResponse.redirect(new URL(target, req.url)));
  }

  if (canBypassAuthProxy(pathname)) {
    return buildPassthrough();
  }

  if (!user) {
    const loginUrl = new URL("/auth/signin", req.url);
    loginUrl.searchParams.set("from", buildCurrentPath(pathname, search));
    return withRefreshedCookies(NextResponse.redirect(loginUrl));
  }

  return buildPassthrough();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
