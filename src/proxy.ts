import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { preventAuthResponseCaching } from "@/lib/server/auth/api";
import { buildCurrentPath, canBypassAuthProxy, isSignInRoute, resolvePostLoginRedirect } from "@/lib/server/route-policy";

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isSignIn = isSignInRoute(pathname);

  const { createServerClient } = await import("@supabase/ssr");

  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        response = NextResponse.next({ request: req });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isSignIn) {
    if (!user) return preventAuthResponseCaching(response);

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (error || (profile?.role !== "admin" && profile?.role !== "user")) {
      return preventAuthResponseCaching(response);
    }

    const redirectUrl = new URL(resolvePostLoginRedirect(profile.role, req.nextUrl.searchParams.get("from")), req.url);
    return preventAuthResponseCaching(NextResponse.redirect(redirectUrl));
  }

  if (canBypassAuthProxy(pathname)) {
    return preventAuthResponseCaching(response);
  }

  if (!user) {
    const loginUrl = new URL("/auth/signin", req.url);
    loginUrl.searchParams.set("from", buildCurrentPath(pathname, search));
    return preventAuthResponseCaching(NextResponse.redirect(loginUrl));
  }

  return preventAuthResponseCaching(response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
