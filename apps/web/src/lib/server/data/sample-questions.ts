import { prisma } from "@/lib/server/db/client";

export async function listSampleQuestions() {
  return prisma.sampleQuestion.findMany({
    where: { document: { isBuiltIn: true, status: "indexed" } },
    select: { id: true, documentId: true, question: true },
    orderBy: { createdAt: "asc" },
  });
}
