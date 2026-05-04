import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { CreateSessionInputSchema } from "@/lib/schemas/session";
import { getApiUser } from "@/lib/auth/get-api-user";
import { corsPreflightResponse, withCors } from "@/lib/http/cors";

export function OPTIONS(req: NextRequest) {
  return corsPreflightResponse(req);
}

export async function GET(req: NextRequest) {
  const user = await getApiUser(req);
  if (!user) {
    return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }), req);
  }

  const sessions = await prisma.session.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true, createdAt: true },
  });
  return withCors(NextResponse.json(sessions), req);
}

export async function POST(req: NextRequest) {
  const user = await getApiUser(req);
  if (!user) {
    return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }), req);
  }

  const parsed = CreateSessionInputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return withCors(NextResponse.json({ error: parsed.error.flatten() }, { status: 400 }), req);
  }
  const { id, title } = parsed.data;
  const session = await prisma.session.create({
    data: { id, userId: user.id, title: title ?? "New Chat" },
  });
  return withCors(NextResponse.json(session, { status: 201 }), req);
}
