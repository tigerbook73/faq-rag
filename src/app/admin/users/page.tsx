import { PageShell } from "@/components/layout/PageShell";
import { AdminUsersWorkspace, type AdminUser } from "@/components/admin/AdminUsersWorkspace";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listUsers } from "@/lib/data/users";

export default async function AdminUsersPage() {
  const [actor, users] = await Promise.all([requireAdmin(), listUsers()]);

  const initialUsers: AdminUser[] = users.map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <PageShell className="max-w-(--container-app-workspace) space-y-6">
      <h1 className="text-app-title">用户管理</h1>
      <AdminUsersWorkspace actorId={actor.id} initialUsers={initialUsers} />
    </PageShell>
  );
}
