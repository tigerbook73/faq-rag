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

export async function findDuplicateDocument(contentHash: string, embeddingModel: string) {
  return prisma.document.findUnique({
    where: { contentHash_embeddingModel: { contentHash, embeddingModel } },
  });
}

export async function createPendingDocument(input: {
  name: string;
  mime: string;
  contentHash: string;
  sizeBytes: number;
  embeddingModel?: string;
}) {
  return prisma.document.create({
    data: {
      name: input.name,
      mime: input.mime,
      contentHash: input.contentHash,
      sizeBytes: input.sizeBytes,
      status: "pending",
      ...(input.embeddingModel ? { embeddingModel: input.embeddingModel } : {}),
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

export async function setDocumentIndexed(documentId: string) {
  return prisma.document.update({
    where: { id: documentId },
    data: { status: "indexed", errorMsg: null },
  });
}

export async function setDocumentFailed(documentId: string, errorMsg: string) {
  return prisma.document
    .update({
      where: { id: documentId },
      data: { status: "failed", errorMsg },
    })
    .catch(() => {});
}

export async function findUnembeddedChunks(
  docId: string,
  limit: number,
): Promise<Array<{ id: string; content: string }>> {
  return prisma.$queryRaw<Array<{ id: string; content: string }>>`
    SELECT id::text, content FROM chunks
    WHERE document_id = ${docId}::uuid AND embedding IS NULL
    ORDER BY ord
    LIMIT ${limit}
  `;
}

export async function countUnembeddedChunks(docId: string): Promise<number> {
  const result = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*)::bigint as count FROM chunks
    WHERE document_id = ${docId}::uuid AND embedding IS NULL
  `;
  return Number(result[0].count);
}

export async function updateChunkEmbeddings(chunks: Array<{ id: string; embedding: number[] }>): Promise<void> {
  await prisma.$transaction(
    chunks.map(
      ({ id, embedding }) =>
        prisma.$executeRaw`
        UPDATE chunks SET embedding = ${`[${embedding.join(",")}]`}::vector
        WHERE id = ${id}::uuid
      `,
    ),
  );
}
