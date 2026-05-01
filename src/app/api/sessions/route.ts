import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { CreateSessionInputSchema } from "@/lib/schemas/session";

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
    data: { id, title: title ?? "New Chat" },
  });
  return NextResponse.json(session, { status: 201 });
}
