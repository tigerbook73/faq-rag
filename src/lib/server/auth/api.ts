import { NextRequest, NextResponse } from "next/server";
import type { ZodError } from "zod";
import type { UserProfile } from "@/generated/prisma";
import { AuthError } from "./errors";
import { requireUser } from "./require-user";
import { requireAdmin } from "./require-admin";

export function preventAuthResponseCaching(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  throw error;
}

export function validationErrorResponse(error: ZodError) {
  return NextResponse.json({ error: "Validation failed", fieldErrors: error.flatten().fieldErrors }, { status: 400 });
}

export function notFoundResponse() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

type RouteCtx<P = Record<string, string>> = { params: Promise<P> };
type RouteHandler<P> = (actor: UserProfile, req: NextRequest, ctx: RouteCtx<P>) => Promise<Response>;

export function withUser<P = Record<string, string>>(handler: RouteHandler<P>) {
  return async (req: NextRequest, ctx?: RouteCtx<P>): Promise<Response> => {
    try {
      const actor = await requireUser();
      return await handler(actor, req, ctx ?? { params: Promise.resolve({} as P) });
    } catch (error) {
      return authErrorResponse(error);
    }
  };
}

export function withAdmin<P = Record<string, string>>(handler: RouteHandler<P>) {
  return async (req: NextRequest, ctx?: RouteCtx<P>): Promise<Response> => {
    try {
      const actor = await requireAdmin();
      return await handler(actor, req, ctx ?? { params: Promise.resolve({} as P) });
    } catch (error) {
      return authErrorResponse(error);
    }
  };
}
