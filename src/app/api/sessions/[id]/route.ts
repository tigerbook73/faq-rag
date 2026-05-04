import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { Prisma } from "@/generated/prisma";
import { UpdateSessionInputSchema } from "@/lib/schemas/session";
import { getApiUser } from "@/lib/auth/get-api-user";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const user = await getApiUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const session = await prisma.session.findFirst({
    where: { id, userId: user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(session);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getApiUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const parsed = UpdateSessionInputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { title, messages } = parsed.data;

  const session = await prisma.$transaction(async (tx) => {
    const existing = await tx.session.findUnique({ where: { id }, select: { userId: true } });
    if (existing && existing.userId !== user.id) return null;

    if (existing) {
      await tx.session.update({
        where: { id },
        data: { ...(title !== undefined && { title }) },
      });
    } else {
      await tx.session.create({
        data: { id, userId: user.id, title: title ?? "New Chat" },
      });
    }

    if (messages !== undefined) {
      await tx.sessionMessage.deleteMany({ where: { sessionId: id } });
      if (messages.length > 0) {
        await tx.sessionMessage.createMany({
          data: messages.map((m) => ({
            sessionId: id,
            role: m.role,
            content: m.content,
            citations: m.citations ? (m.citations as Prisma.InputJsonValue) : Prisma.JsonNull,
          })),
        });
      }
    }
    return tx.session.findFirst({
      where: { id, userId: user.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  });

  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(session);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const user = await getApiUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await prisma.session.deleteMany({ where: { id, userId: user.id } });
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
