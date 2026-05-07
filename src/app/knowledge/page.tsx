import { DocumentTable } from "@/components/knowledge/DocumentTable";
import { PublicDocumentTable } from "@/components/knowledge/PublicDocumentTable";
import { UploadZone } from "@/components/knowledge/UploadZone";
import { PageShell } from "@/components/layout/PageShell";
import { requireUser } from "@/lib/auth/require-user";
import { listDocumentsForOwner } from "@/lib/data/documents";
import { listSelectablePublicDocuments } from "@/lib/data/public-documents";

export default async function KnowledgePage() {
  const actor = await requireUser();
  const [documents, publicDocuments] = await Promise.all([
    listDocumentsForOwner(actor.id),
    listSelectablePublicDocuments(actor.id),
  ]);

  return (
    <PageShell className="max-w-(--container-app-workspace) space-y-8">
      <UploadZone />
      <DocumentTable initialDocuments={documents} />
      <PublicDocumentTable initialDocuments={publicDocuments} />
    </PageShell>
  );
}
