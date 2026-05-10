import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildCurrentPath, canBypassAuthProxy, isSignInRoute, resolvePostLoginRedirect } from "@/lib/route-policy";

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
    data: { session },
  } = await supabase.auth.getSession();

  if (isSignIn) {
    if (!session) return NextResponse.next();

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error || (profile?.role !== "admin" && profile?.role !== "user")) {
      return NextResponse.next();
    }

    const redirectUrl = new URL(resolvePostLoginRedirect(profile.role, req.nextUrl.searchParams.get("from")), req.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (canBypassAuthProxy(pathname)) {
    return NextResponse.next();
  }

  if (!session) {
    const loginUrl = new URL("/auth/signin", req.url);
    loginUrl.searchParams.set("from", buildCurrentPath(pathname, search));
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
