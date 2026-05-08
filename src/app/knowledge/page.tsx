import { DocumentTable } from "@/components/knowledge/DocumentTable";
import { PublicDocumentTable } from "@/components/knowledge/PublicDocumentTable";
import { UploadZone } from "@/components/knowledge/UploadZone";
import { PageShell } from "@/components/layout/PageShell";

export default function KnowledgePage() {
  return (
    <PageShell className="max-w-(--container-app-workspace) space-y-8">
      <UploadZone />
      <DocumentTable />
      <PublicDocumentTable />
    </PageShell>
  );
}
