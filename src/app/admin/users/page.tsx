import { PageShell } from "@/components/layout/PageShell";
import { AdminUsersWorkspace } from "@/components/admin/AdminUsersWorkspace";

export default function AdminUsersPage() {
  return (
    <PageShell className="max-w-(--container-app-workspace) space-y-6">
      <h1 className="text-app-title">Users</h1>
      <AdminUsersWorkspace />
    </PageShell>
  );
}
