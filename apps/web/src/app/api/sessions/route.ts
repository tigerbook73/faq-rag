import { NextRequest, NextResponse } from "next/server";
import { CreateSessionInputSchema } from "@faq-rag/shared";
import { validationErrorResponse } from "@/lib/server/api";
import { createSession, listSessions } from "@/lib/server/data/sessions";

export async function GET() {
  const sessions = await listSessions();
  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const parsed = CreateSessionInputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }
  const session = await createSession(parsed.data);
  return NextResponse.json(session, { status: 201 });
}
