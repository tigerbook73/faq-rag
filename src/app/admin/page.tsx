import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageShell } from "@/components/layout/PageShell";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listAdminDocuments } from "@/lib/data/documents";
import { listUsers } from "@/lib/data/users";

export default async function AdminPage() {
  await requireAdmin();
  const [users, documents] = await Promise.all([
    listUsers(),
    listAdminDocuments({ skip: 0, take: 50 }),
  ]);

  return (
    <PageShell className="max-w-(--container-app-workspace) space-y-8">
      <section className="space-y-4">
        <div>
          <h1 className="text-app-title">Admin</h1>
          <p className="text-app-muted">Users and documents across the workspace.</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-app-section">Users</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="hidden sm:table-cell">Documents</TableHead>
              <TableHead className="hidden sm:table-cell">Sessions</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{user._count.documents}</TableCell>
                <TableCell className="hidden sm:table-cell">{user._count.sessions}</TableCell>
                <TableCell className="text-muted-foreground hidden text-xs md:table-cell">
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-4">
        <h2 className="text-app-section">Documents</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Visibility</TableHead>
              <TableHead className="hidden md:table-cell">Selections</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.items.map((document) => (
              <TableRow key={document.id}>
                <TableCell className="max-w-48 truncate font-medium sm:max-w-80">{document.name}</TableCell>
                <TableCell className="hidden sm:table-cell">{document.owner.email}</TableCell>
                <TableCell>
                  <Badge variant={document.status === "failed" ? "destructive" : "secondary"}>
                    {document.status}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">{document.visibility}</TableCell>
                <TableCell className="hidden md:table-cell">{document._count.selections}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </PageShell>
  );
}
