import { AdminWorkspace, type AdminDocument, type AdminUser } from "@/components/admin/AdminWorkspace";
import { PageShell } from "@/components/layout/PageShell";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listAdminDocuments } from "@/lib/data/documents";
import { listUsers } from "@/lib/data/users";

export default async function AdminPage() {
  const actor = await requireAdmin();
  const [users, documents] = await Promise.all([
    listUsers(),
    listAdminDocuments({ skip: 0, take: 50 }),
  ]);

  const initialUsers: AdminUser[] = users.map((user) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    _count: user._count,
  }));

  const initialDocuments: AdminDocument[] = documents.items.map((document) => ({
    id: document.id,
    name: document.name,
    ownerUserId: document.ownerUserId,
    status: document.status,
    visibility: document.visibility,
    createdAt: document.createdAt.toISOString(),
    owner: document.owner,
    _count: document._count,
  }));

  return (
    <PageShell className="max-w-(--container-app-workspace) space-y-8">
      <AdminWorkspace actorId={actor.id} initialUsers={initialUsers} initialDocuments={initialDocuments} />
    </PageShell>
  );
}
