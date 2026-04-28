import { prisma } from "@/lib/db/client";
import { DocumentTable } from "@/components/knowledge/DocumentTable";
import { UploadZone } from "@/components/knowledge/UploadZone";

export default async function KnowledgePage() {
  const documents = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { chunks: true } } },
  });

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-5xl md:w-[80%] w-full mx-auto px-4 py-8 space-y-8">
        <UploadZone />
        <DocumentTable initialDocuments={documents} />
      </div>
    </div>
  );
}
