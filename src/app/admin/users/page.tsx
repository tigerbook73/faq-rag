import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageShell } from "@/components/layout/PageShell";
import { listUsers } from "@/lib/data/users";

export default async function AdminUsersPage() {
  const users = await listUsers();

  return (
    <PageShell className="max-w-(--container-app-workspace) space-y-4">
      <h1 className="text-app-title">用户管理</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>邮箱</TableHead>
            <TableHead>角色</TableHead>
            <TableHead>注册日期</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {new Date(user.createdAt).toLocaleDateString("zh-CN")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PageShell>
  );
}
