import { NextResponse } from "next/server";
import { CreateSessionInputSchema } from "@/lib/shared/schemas/session";
import { validationErrorResponse, withUser } from "@/lib/server/auth/api";
import { createSessionForUser, listSessionsForUser } from "@/lib/server/data/sessions";

export const GET = withUser(async (actor) => {
  const sessions = await listSessionsForUser(actor.id);
  return NextResponse.json(sessions);
});

export const POST = withUser(async (actor, req) => {
  const parsed = CreateSessionInputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }
  const session = await createSessionForUser(actor.id, parsed.data);
  return NextResponse.json(session, { status: 201 });
});
