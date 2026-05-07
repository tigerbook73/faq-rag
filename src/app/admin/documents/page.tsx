import { PageShell } from "@/components/layout/PageShell";
import { AdminDocumentsWorkspace, type AdminDocument } from "@/components/admin/AdminDocumentsWorkspace";
import { listAdminDocuments } from "@/lib/data/documents";

export default async function AdminDocumentsPage() {
  const { items } = await listAdminDocuments({ skip: 0, take: 100 });

  const initialDocuments: AdminDocument[] = items.map((doc) => ({
    id: doc.id,
    name: doc.name,
    ownerUserId: doc.ownerUserId,
    status: doc.status,
    visibility: doc.visibility,
    owner: { email: doc.owner.email },
    _count: { selections: doc._count.selections },
  }));

  return (
    <PageShell className="max-w-(--container-app-workspace) space-y-4">
      <h1 className="text-app-title">Documents</h1>
      <AdminDocumentsWorkspace initialDocuments={initialDocuments} />
    </PageShell>
  );
}
