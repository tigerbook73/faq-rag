import { prisma } from "@/src/lib/db/client";
import { DocumentTable } from "@/src/components/knowledge/DocumentTable";
import { UploadZone } from "@/src/components/knowledge/UploadZone";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function KnowledgePage() {
  const documents = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { chunks: true } } },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground text-sm mt-1">Upload and manage your knowledge documents</p>
        </div>
        <Link href="/chat/last">
          <Button variant="secondary">Back to Chat</Button>
        </Link>
      </div>

      <UploadZone />
      <DocumentTable initialDocuments={documents} />
    </div>
  );
}
