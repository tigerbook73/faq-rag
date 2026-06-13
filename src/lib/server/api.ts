import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function validationErrorResponse(error: ZodError) {
  return NextResponse.json({ error: "Validation failed", fieldErrors: error.flatten().fieldErrors }, { status: 400 });
}

export function notFoundResponse() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
