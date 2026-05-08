import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { AuthError } from "./errors";

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  throw error;
}

export function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    { error: "Validation failed", fieldErrors: error.flatten().fieldErrors },
    { status: 400 },
  );
}
