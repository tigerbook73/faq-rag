import { prisma } from "@/lib/db/client";
import { DocumentTable } from "@/components/knowledge/DocumentTable";
import { UploadZone } from "@/components/knowledge/UploadZone";
import { PageShell } from "@/components/layout/PageShell";

export default async function KnowledgePage() {
  const documents = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { chunks: true } } },
  });

  return (
    <PageShell className="max-w-5xl space-y-8">
      <UploadZone />
      <DocumentTable initialDocuments={documents} />
    </PageShell>
  );
}
