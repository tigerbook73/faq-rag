"use client";

import { useState, useEffect } from "react";
import { DocumentTable } from "@/components/knowledge/DocumentTable";
import { PublicDocumentTable } from "@/components/knowledge/PublicDocumentTable";
import { UploadZone } from "@/components/knowledge/UploadZone";
import { PageShell } from "@/components/layout/PageShell";
import { Skeleton } from "@/components/ui/skeleton";
import type { Document } from "@/components/knowledge/DocumentRow";
import type { PublicDocument } from "@/components/knowledge/PublicDocumentTable";

function KnowledgeLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-(--container-app-workspace) space-y-8 px-(--spacing-app-page-x) py-(--spacing-app-page-y)">
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [publicDocuments, setPublicDocuments] = useState<PublicDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/documents").then((r) => r.json()),
      fetch("/api/public-documents").then((r) => r.json()),
    ])
      .then(([docsData, pubDocsData]) => {
        setDocuments(
          (docsData.items ?? []).map((d: Document & { createdAt: string }) => ({
            ...d,
            createdAt: new Date(d.createdAt),
          })),
        );
        setPublicDocuments(
          (pubDocsData.items ?? []).map((d: PublicDocument & { createdAt: string }) => ({
            ...d,
            createdAt: new Date(d.createdAt),
          })),
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <KnowledgeLoadingSkeleton />;

  return (
    <PageShell className="max-w-(--container-app-workspace) space-y-8">
      <UploadZone />
      <DocumentTable initialDocuments={documents} />
      <PublicDocumentTable initialDocuments={publicDocuments} />
    </PageShell>
  );
}
