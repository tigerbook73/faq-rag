import { DocumentTable } from "@/components/knowledge/DocumentTable";
import { UploadZone } from "@/components/knowledge/UploadZone";
import { PageShell } from "@/components/layout/PageShell";
import { requireUser } from "@/lib/auth/require-user";
import { listDocumentsForOwner } from "@/lib/data/documents";

export default async function KnowledgePage() {
  const actor = await requireUser();
  const documents = await listDocumentsForOwner(actor.id);

  return (
    <PageShell className="max-w-(--container-app-workspace) space-y-8">
      <UploadZone />
      <DocumentTable initialDocuments={documents} />
    </PageShell>
  );
}
