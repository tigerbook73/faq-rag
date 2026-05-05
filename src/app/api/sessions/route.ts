import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { CreateSessionInputSchema } from "@/lib/schemas/session";
import { DEFAULT_ADMIN_USER_ID } from "@/lib/default-users";

export async function GET() {
  const sessions = await prisma.session.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true, createdAt: true },
  });
  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const parsed = CreateSessionInputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { id, title } = parsed.data;
  const session = await prisma.session.create({
    data: { id, userId: DEFAULT_ADMIN_USER_ID, title: title ?? "New Chat" },
  });
  return NextResponse.json(session, { status: 201 });
}
