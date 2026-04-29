import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/session";
import { AUTH_PROVIDER } from "@/lib/config";

const LOCAL_PUBLIC_PATHS = ["/auth/signin", "/about"];
const SUPABASE_PUBLIC_PATHS = ["/auth/signin-supabase", "/about"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (AUTH_PROVIDER === "supabase") {
    if (SUPABASE_PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }
    return handleSupabaseAuth(req, pathname);
  }

  // local auth (default)
  if (LOCAL_PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  return handleLocalAuth(req, pathname);
}

async function handleLocalAuth(req: NextRequest, pathname: string) {
  const token = req.cookies.get("faq_session")?.value;
  const session = token ? await decrypt(token) : null;

  if (!session) {
    const loginUrl = new URL("/auth/signin", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

async function handleSupabaseAuth(req: NextRequest, pathname: string) {
  const { createServerClient } = await import("@supabase/ssr");

  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
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
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/auth/signin-supabase", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
