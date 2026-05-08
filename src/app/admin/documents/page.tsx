"use client";

import { useState, useEffect } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminDocumentsWorkspace, type AdminDocument } from "@/components/admin/AdminDocumentsWorkspace";

function AdminDocumentsSkeleton() {
  return (
    <div className="mx-auto max-w-(--container-app-workspace) space-y-4 px-(--spacing-app-page-x) py-(--spacing-app-page-y)">
      <Skeleton className="h-8 w-32" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<AdminDocument[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/documents?pageSize=100")
      .then((r) => r.json())
      .then((data) => setDocuments(data.items ?? []));
  }, []);

  if (!documents) return <AdminDocumentsSkeleton />;

  return (
    <PageShell className="max-w-(--container-app-workspace) space-y-4">
      <h1 className="text-app-title">Documents</h1>
      <AdminDocumentsWorkspace initialDocuments={documents} />
    </PageShell>
  );
}
