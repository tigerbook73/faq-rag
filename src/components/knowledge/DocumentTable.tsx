"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface Document {
  id: string;
  name: string;
  lang: string;
  status: string;
  sizeBytes: number;
  errorMsg: string | null;
  createdAt: string;
  _count: { chunks: number };
}

interface DocumentListResponse {
  items: Document[];
  total: number;
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "indexed") return "default";
  if (status === "pending") return "secondary";
  if (status === "failed") return "destructive";
  return "outline";
}

async function fetchDocuments(): Promise<DocumentListResponse> {
  const res = await fetch("/api/documents");
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

async function deleteDocument(id: string): Promise<void> {
  await fetch(`/api/documents/${id}`, { method: "DELETE" });
}

async function reindexDocument(id: string): Promise<void> {
  await fetch(`/api/documents/${id}/reindex`, { method: "POST" });
}

export function DocumentTable() {
  const qc = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: fetchDocuments,
    refetchInterval: (query) => {
      const hasPending = query.state.data?.items.some((d) => d.status === "pending");
      return hasPending ? 3000 : false;
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });

  const reindexMut = useMutation({
    mutationFn: reindexDocument,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">No documents yet. Upload some files above.</div>
    );
  }

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Lang</TableHead>
          <TableHead>Chunks</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Uploaded</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((doc) => (
          <TableRow key={doc.id}>
            <TableCell className="font-medium max-w-50 truncate">{doc.name}</TableCell>
            <TableCell>{doc.lang}</TableCell>
            <TableCell>{doc._count.chunks}</TableCell>
            <TableCell>
              <Badge variant={statusVariant(doc.status)} title={doc.errorMsg ?? undefined}>
                {doc.status}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {new Date(doc.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={reindexMut.isPending}
                onClick={() => reindexMut.mutate(doc.id)}
              >
                Reindex
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteTarget(doc.id)}
              >
                Delete
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>

    <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Delete document?</DialogTitle>
          <DialogDescription>
            This will permanently remove the document and all its indexed chunks.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            variant="destructive"
            disabled={deleteMut.isPending}
            onClick={() => {
              if (deleteTarget) deleteMut.mutate(deleteTarget);
              setDeleteTarget(null);
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
