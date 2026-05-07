import { NextResponse } from "next/server";
import { AuthError } from "./errors";

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  throw error;
}
