"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface AdminDocument {
  id: string;
  name: string;
  ownerUserId: string;
  status: string;
  visibility: "private" | "public";
  owner: { email: string };
  _count: { selections: number };
}

interface AdminDocumentsWorkspaceProps {
  initialDocuments: AdminDocument[];
}

export function AdminDocumentsWorkspace({ initialDocuments }: AdminDocumentsWorkspaceProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [deleteTarget, setDeleteTarget] = useState<AdminDocument | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDeleteDocument() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const res = await fetch(`/api/admin/documents/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `删除文档失败 (${res.status})`);
      }
      setDocuments((curr) => curr.filter((d) => d.id !== deleteTarget.id));
      setDeleteTarget(null);
      router.refresh();
      toast.success("文档已删除");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除文档失败");
    } finally {
      setDeletingId(null);
    }
  }

  if (documents.length === 0) {
    return <p className="text-muted-foreground text-sm">暂无文档</p>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>文件名</TableHead>
            <TableHead className="hidden sm:table-cell">所有者</TableHead>
            <TableHead>状态</TableHead>
            <TableHead className="hidden md:table-cell">可见性</TableHead>
            <TableHead className="hidden md:table-cell text-right">选择数</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell className="max-w-48 truncate font-medium sm:max-w-72">{doc.name}</TableCell>
              <TableCell className="text-muted-foreground hidden text-sm sm:table-cell">{doc.owner.email}</TableCell>
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
              <TableCell className="hidden md:table-cell">
                <Badge variant={doc.visibility === "public" ? "outline" : "secondary"}>
                  {doc.visibility === "public" ? "公开" : "私有"}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground hidden text-right text-sm md:table-cell">
                {doc._count.selections}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deletingId === doc.id}
                  onClick={() => setDeleteTarget(doc)}
                >
                  删除
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>删除文档？</DialogTitle>
            <DialogDescription>
              将删除文档 <strong>{deleteTarget?.name}</strong> 的索引块、存储文件及所有公开选择记录，此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button variant="destructive" disabled={!!deletingId} onClick={handleDeleteDocument}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
