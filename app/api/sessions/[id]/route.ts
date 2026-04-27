import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/db/client";
import { Prisma } from "@/src/generated/prisma";

const patchSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(8000),
    citations: z.array(z.unknown()).optional(),
  })).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await prisma.session.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(session);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { title, messages } = parsed.data;

  const session = await prisma.$transaction(async (tx) => {
    await tx.session.upsert({
      where: { id },
      create: { id, title: title ?? "New Chat" },
      update: { ...(title !== undefined && { title }) },
    });
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
    return tx.session.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  });

  return NextResponse.json(session);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.session.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
