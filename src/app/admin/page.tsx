import Link from "next/link";
import { Files, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageShell } from "@/components/layout/PageShell";
import { listAdminDocuments } from "@/lib/data/documents";
import { listUsers } from "@/lib/data/users";

export default async function AdminDashboardPage() {
  const [users, documents] = await Promise.all([
    listUsers(),
    listAdminDocuments({ skip: 0, take: 5 }),
  ]);

  const adminCount = users.filter((u) => u.role === "admin").length;
  const userCount = users.filter((u) => u.role === "user").length;

  return (
    <PageShell className="max-w-(--container-app-workspace) space-y-6">
      <h1 className="text-app-title">仪表板</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard title="总用户数" value={users.length} />
        <StatCard title="管理员" value={adminCount} />
        <StatCard title="普通用户" value={userCount} />
        <StatCard title="总文档数" value={documents.total} />
      </div>

      <div className="flex gap-3">
        <Button render={<Link href="/admin/users" />}>
          <Users className="h-4 w-4" />
          管理用户
        </Button>
        <Button variant="outline" render={<Link href="/admin/documents" />}>
          <Files className="h-4 w-4" />
          管理文档
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-app-section">最近文档</h2>
        {documents.items.length === 0 ? (
          <p className="text-muted-foreground text-sm">暂无文档</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>文件名</TableHead>
                <TableHead>所有者</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>可见性</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.items.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{doc.owner.email}</TableCell>
                  <TableCell>
                    <Badge variant={doc.status === "indexed" ? "default" : doc.status === "failed" ? "destructive" : "secondary"}>
                      {doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={doc.visibility === "public" ? "outline" : "secondary"}>
                      {doc.visibility === "public" ? "公开" : "私有"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </PageShell>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
