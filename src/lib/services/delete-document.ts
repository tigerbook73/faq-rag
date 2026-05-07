import { prisma } from "@/lib/db/client";
import { deleteUploadedFile } from "@/lib/storage";
import { logger } from "@/lib/logger";

export async function deleteDocument(documentId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, fileRef: true },
  });
  if (!doc) return null;

  if (doc.fileRef) {
    await deleteUploadedFile(doc.fileRef).catch((error) => {
      logger.warn({ error, documentId, fileRef: doc.fileRef }, "document storage delete failed");
    });
  }

  return prisma.document.delete({ where: { id: documentId } });
}
