"use client";

import { useState } from "react";
import useSWR from "swr";
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
import { type AdminDocumentItem as AdminDocument } from "@/lib/schemas/document";

const SWR_KEY = "/api/admin/documents?pageSize=100";
const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function AdminDocumentsWorkspace() {
  const { data, mutate } = useSWR<{ items: AdminDocument[] }>(SWR_KEY, fetcher);
  const documents = data?.items ?? [];
  const [deleteTarget, setDeleteTarget] = useState<AdminDocument | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDeleteDocument() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const res = await fetch(`/api/admin/documents/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed to delete document (${res.status})`);
      }
      setDeleteTarget(null);
      await mutate();
      toast.success("Document deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Filename</TableHead>
            <TableHead className="hidden sm:table-cell">Owner</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Visibility</TableHead>
            <TableHead className="hidden text-right md:table-cell">Selections</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground text-center text-sm">
                No documents found.
              </TableCell>
            </TableRow>
          ) : (
            documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="max-w-48 truncate font-medium sm:max-w-72">{doc.name}</TableCell>
                <TableCell className="text-muted-foreground hidden text-sm sm:table-cell">{doc.owner.email}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      doc.status === "indexed" ? "default" : doc.status === "failed" ? "destructive" : "secondary"
                    }
                  >
                    {doc.status}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant={doc.visibility === "public" ? "outline" : "secondary"}>{doc.visibility}</Badge>
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
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete Document?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> including its index chunks, stored
              file, and all public selection records. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={!!deletingId} onClick={handleDeleteDocument}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
