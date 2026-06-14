import { prisma } from "@/lib/server/db/client";

export async function listDocuments() {
  return prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { chunks: true } } },
  });
}

export async function listDocumentsPage(input: { skip: number; take: number }) {
  const [items, total] = await Promise.all([
    prisma.document.findMany({
      skip: input.skip,
      take: input.take,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { chunks: true } } },
    }),
    prisma.document.count(),
  ]);

  return { items, total };
}

export async function findDuplicateDocument(contentHash: string) {
  return prisma.document.findUnique({
    where: { contentHash },
  });
}

export async function createPendingDocument(input: {
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
      sizeBytes: input.sizeBytes,
      status: "pending",
    },
    include: { _count: { select: { chunks: true } } },
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

export async function getDocumentForWrite(documentId: string) {
  return prisma.document.findUnique({ where: { id: documentId } });
}

export async function resetDocumentForReindex(documentId: string) {
  return prisma.document.update({
    where: { id: documentId },
    data: { status: "pending", errorMsg: null },
  });
}

export async function setDocumentUploaded(documentId: string) {
  return prisma.document.updateMany({
    where: { id: documentId, status: "pending" },
    data: { status: "uploaded" },
  });
}
