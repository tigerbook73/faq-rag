import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/src/lib/session";

const PUBLIC_PATHS = ["/auth/signin", "/about"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get("faq_session")?.value;
  const session = token ? await decrypt(token) : null;

  if (!session) {
    const loginUrl = new URL("/auth/signin", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
