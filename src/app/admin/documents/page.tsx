import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageShell } from "@/components/layout/PageShell";
import { listAdminDocuments } from "@/lib/data/documents";

export default async function AdminDocumentsPage() {
  const { items } = await listAdminDocuments({ skip: 0, take: 100 });

  return (
    <PageShell className="max-w-(--container-app-workspace) space-y-4">
      <h1 className="text-app-title">文档管理</h1>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">暂无文档</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>文件名</TableHead>
              <TableHead>所有者</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>可见性</TableHead>
              <TableHead className="text-right">选择数</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">{doc.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{doc.owner.email}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      doc.status === "indexed"
                        ? "default"
                        : doc.status === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {doc.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={doc.visibility === "public" ? "outline" : "secondary"}>
                    {doc.visibility === "public" ? "公开" : "私有"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm">{doc._count.selections}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PageShell>
  );
}
