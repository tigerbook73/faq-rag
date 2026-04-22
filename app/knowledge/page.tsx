"use client";

import { useCallback, useState } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { UploadZone } from "@/src/components/knowledge/UploadZone";
import { DocumentTable } from "@/src/components/knowledge/DocumentTable";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const qc = new QueryClient();

function KnowledgePageInner() {
  const queryClient = useQueryClient();
  const [rebuilding, setRebuilding] = useState(false);

  const handleUploaded = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["documents"] });
  }, [queryClient]);

  const handleRebuildAll = useCallback(async () => {
    setRebuilding(true);
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      for (const doc of data.items) {
        await fetch(`/api/documents/${doc.id}/reindex`, { method: "POST" });
      }
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    } finally {
      setRebuilding(false);
    }
  }, [queryClient]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground text-sm mt-1">Upload and manage your knowledge documents</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={rebuilding} onClick={handleRebuildAll}>
            {rebuilding ? "Rebuilding…" : "Rebuild All"}
          </Button>
          <Link href="/">
            <Button variant="secondary">Back to Chat</Button>
          </Link>
        </div>
      </div>

      <UploadZone onUploaded={handleUploaded} />
      <DocumentTable />
    </div>
  );
}

export default function KnowledgePage() {
  return (
    <QueryClientProvider client={qc}>
      <KnowledgePageInner />
    </QueryClientProvider>
  );
}
