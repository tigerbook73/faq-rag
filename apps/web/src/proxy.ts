import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Dev-only: lets the mobile client's Expo web preview (a different origin
// than the Next.js dev server) call these routes locally. Not applied in
// production — deployed API access from a browser-hosted client is a
// separate decision that hasn't been made yet.
const DEV_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/chat/last", req.url));
  }

  if (process.env.NODE_ENV !== "production" && pathname.startsWith("/api/")) {
    if (req.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: DEV_CORS_HEADERS });
    }
    const res = NextResponse.next();
    for (const [key, value] of Object.entries(DEV_CORS_HEADERS)) res.headers.set(key, value);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
