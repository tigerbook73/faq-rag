"use client";

import { DocumentTable } from "@/components/knowledge/DocumentTable";
import { UploadZone } from "@/components/knowledge/UploadZone";

export function KnowledgeWorkspace() {
  return (
    <div className="space-y-8">
      <UploadZone />
      <DocumentTable />
    </div>
  );
}
