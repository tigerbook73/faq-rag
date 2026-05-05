import { prisma } from "@/lib/db/client";

export async function listDocumentsForOwner(ownerUserId: string) {
  return prisma.document.findMany({
    where: { ownerUserId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { chunks: true } } },
  });
}
