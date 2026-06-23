"use client";

import { DocumentTable } from "@/components/knowledge/DocumentTable";
import { UploadZone } from "@/components/knowledge/UploadZone";

export function KnowledgeWorkspace({ maxBytes }: { maxBytes: number }) {
  return (
    <div className="space-y-8">
      <UploadZone maxBytes={maxBytes} />
      <DocumentTable />
    </div>
  );
}
