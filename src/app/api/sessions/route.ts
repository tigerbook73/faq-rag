import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db/client";

export async function GET() {
  const sessions = await prisma.session.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true, createdAt: true },
  });
  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const { id, title } = await req.json();
  const session = await prisma.session.create({
    data: { id, title: title ?? "New Chat" },
  });
  return NextResponse.json(session, { status: 201 });
}
