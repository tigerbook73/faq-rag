import { prisma } from "@/lib/db/client";

export async function getSessionForUser(userId: string, sessionId: string) {
  return prisma.session.findFirst({
    where: { id: sessionId, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export async function listSessionsForUser(userId: string) {
  return prisma.session.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true, createdAt: true },
  });
}
