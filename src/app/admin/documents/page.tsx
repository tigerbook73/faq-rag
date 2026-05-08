import { PageShell } from "@/components/layout/PageShell";
import { AdminDocumentsWorkspace } from "@/components/admin/AdminDocumentsWorkspace";

export default function AdminDocumentsPage() {
  return (
    <PageShell className="max-w-(--container-app-workspace) space-y-4">
      <h1 className="text-app-title">Documents</h1>
      <AdminDocumentsWorkspace />
    </PageShell>
  );
}
