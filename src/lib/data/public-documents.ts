import { prisma } from "@/lib/db/client";

export async function listSelectablePublicDocuments(userId: string) {
  const documents = await prisma.document.findMany({
    where: {
      ownerUserId: { not: userId },
      visibility: "public",
      status: "indexed",
    },
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { email: true } },
      selections: {
        where: { userId },
        select: { id: true },
      },
      _count: { select: { chunks: true } },
    },
  });

  return documents.map(({ selections, ...document }) => ({
    ...document,
    selected: selections.length > 0,
  }));
}

export async function selectPublicDocumentForUser(userId: string, documentId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, ownerUserId: true, visibility: true, status: true },
  });

  if (!document) return null;
  if (document.ownerUserId === userId || document.visibility !== "public" || document.status !== "indexed") {
    return null;
  }

  return prisma.publicDocumentSelection.upsert({
    where: { userId_documentId: { userId, documentId } },
    create: { userId, documentId },
    update: {},
  });
}

export async function unselectPublicDocumentForUser(userId: string, documentId: string) {
  return prisma.publicDocumentSelection.deleteMany({
    where: { userId, documentId },
  });
}
