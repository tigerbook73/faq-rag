import { NextRequest, NextResponse } from "next/server";
import { CreateSessionInputSchema } from "@/lib/schemas/session";
import { authErrorResponse, validationErrorResponse } from "@/lib/auth/api";
import { requireUser } from "@/lib/auth/require-user";
import { createSessionForUser, listSessionsForUser } from "@/lib/data/sessions";

export async function GET() {
  try {
    const actor = await requireUser();
    const sessions = await listSessionsForUser(actor.id);
    return NextResponse.json(sessions);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireUser();
    const parsed = CreateSessionInputSchema.safeParse(await req.json());
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }
    const session = await createSessionForUser(actor.id, parsed.data);
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
