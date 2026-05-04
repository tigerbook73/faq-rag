import { NextRequest, NextResponse } from "next/server";

const DEFAULT_DEV_ORIGINS = new Set([
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:19006",
  "http://127.0.0.1:19006",
]);

const ALLOWED_METHODS = "GET, POST, PATCH, DELETE, OPTIONS";
const ALLOWED_HEADERS = "Authorization, Content-Type";

function configuredOrigins() {
  return new Set(
    [
      process.env.NEXT_PUBLIC_APP_URL,
      ...(process.env.API_CORS_ORIGINS ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ].filter(Boolean),
  );
}

function isAllowedOrigin(origin: string) {
  return DEFAULT_DEV_ORIGINS.has(origin) || configuredOrigins().has(origin);
}

export function corsHeaders(req: NextRequest | Request) {
  const origin = req.headers.get("origin");
  const headers = new Headers({
    Vary: "Origin",
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
  });

  if (origin && isAllowedOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

export function corsPreflightResponse(req: NextRequest | Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export function withCors<T extends Response>(response: T, req: NextRequest | Request) {
  corsHeaders(req).forEach((value, key) => response.headers.set(key, value));
  return response;
}
