import { prisma } from "@/lib/db/client";

type DocumentActor = {
  id: string;
  role: "user" | "admin";
};

type DocumentVisibility = "private" | "public";

export async function listDocumentsForOwner(ownerUserId: string) {
  return prisma.document.findMany({
    where: { ownerUserId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { chunks: true } } },
  });
}

export async function listDocumentsPageForOwner(ownerUserId: string, input: { skip: number; take: number }) {
  const where = { ownerUserId };
  const [items, total] = await Promise.all([
    prisma.document.findMany({
      where,
      skip: input.skip,
      take: input.take,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { chunks: true } } },
    }),
    prisma.document.count({ where }),
  ]);

  return { items, total };
}

export async function findDuplicateDocumentForOwner(ownerUserId: string, contentHash: string) {
  return prisma.document.findUnique({
    where: { ownerUserId_contentHash: { ownerUserId, contentHash } },
  });
}

export async function createPendingDocumentForOwner(input: {
  ownerUserId: string;
  name: string;
  mime: string;
  contentHash: string;
  sizeBytes: number;
}) {
  return prisma.document.create({
    data: {
      name: input.name,
      mime: input.mime,
      contentHash: input.contentHash,
      ownerUserId: input.ownerUserId,
      sizeBytes: input.sizeBytes,
      status: "pending",
      visibility: "private",
    },
  });
}

export async function setDocumentFileRef(documentId: string, fileRef: string) {
  return prisma.document.update({
    where: { id: documentId },
    data: { fileRef },
  });
}

export async function deleteDocumentById(documentId: string) {
  return prisma.document.delete({ where: { id: documentId } });
}

export async function getDocumentForWrite(actor: DocumentActor, documentId: string) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return null;
  if (actor.role !== "admin" && doc.ownerUserId !== actor.id) return null;
  return doc;
}

export async function updateDocumentVisibilityForOwner(
  ownerUserId: string,
  documentId: string,
  visibility: DocumentVisibility,
) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { ownerUserId: true },
  });
  if (!doc || doc.ownerUserId !== ownerUserId) return null;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.document.update({
      where: { id: documentId },
      data: { visibility },
      include: { _count: { select: { chunks: true } } },
    });

    if (visibility === "private") {
      await tx.publicDocumentSelection.deleteMany({ where: { documentId } });
    }

    return updated;
  });
}
