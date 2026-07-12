import { prisma } from "@/lib/server/db/client";

export async function listSampleQuestions() {
  const rows = await prisma.sampleQuestion.findMany({
    where: { document: { isBuiltIn: true, status: "indexed" } },
    select: { id: true, documentId: true, question: true },
    orderBy: { createdAt: "asc" },
  });

  // Different embeddingModel variants of the same source document sync the same
  // sidecar question set, so the same question text can be seeded more than once.
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.question)) return false;
    seen.add(row.question);
    return true;
  });
}
