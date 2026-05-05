import { prisma } from "@/lib/db/client";
import { Prisma } from "@/generated/prisma";

export async function getSessionForUser(userId: string, sessionId: string) {
  return prisma.session.findFirst({
    where: { id: sessionId, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export async function createSessionForUser(userId: string, input: { id: string; title?: string }) {
  return prisma.session.create({
    data: { id: input.id, userId, title: input.title ?? "New Chat" },
  });
}

export async function listSessionsForUser(userId: string) {
  return prisma.session.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true, createdAt: true },
  });
}

export async function upsertSessionForUser(
  userId: string,
  sessionId: string,
  input: {
    title?: string;
    messages?: Array<{
      role: "user" | "assistant";
      content: string;
      citations?: unknown;
    }>;
  },
) {
  const existing = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { userId: true },
  });

  if (existing && existing.userId !== userId) return null;

  return prisma.$transaction(async (tx) => {
    await tx.session.upsert({
      where: { id: sessionId },
      create: { id: sessionId, userId, title: input.title ?? "New Chat" },
      update: { ...(input.title !== undefined && { title: input.title }) },
    });

    if (input.messages !== undefined) {
      await tx.sessionMessage.deleteMany({ where: { sessionId } });
      if (input.messages.length > 0) {
        await tx.sessionMessage.createMany({
          data: input.messages.map((message) => ({
            sessionId,
            role: message.role,
            content: message.content,
            citations: message.citations ? (message.citations as Prisma.InputJsonValue) : Prisma.JsonNull,
          })),
        });
      }
    }

    return tx.session.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  });
}

export async function deleteSessionForUser(userId: string, sessionId: string) {
  return prisma.session.deleteMany({
    where: { id: sessionId, userId },
  });
}
