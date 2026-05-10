import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildCurrentPath, canBypassAuthProxy } from "@/lib/route-policy";

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (canBypassAuthProxy(pathname)) {
    return NextResponse.next();
  }

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
