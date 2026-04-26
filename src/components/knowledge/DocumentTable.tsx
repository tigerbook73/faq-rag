"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  lang: string | null;
  status: string;
  sizeBytes: number;
  errorMsg: string | null;
  totalChunks: number | null;
  createdAt: Date;
  _count: { chunks: number };
}

interface Props {
  initialDocuments: Document[];
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "indexed") return "default";
  if (status === "pending") return "secondary";
  if (status === "failed") return "destructive";
  return "outline";
}

export function DocumentTable({ initialDocuments }: Props) {
  const router = useRouter();
  const [polledDocuments, setPolledDocuments] = useState<Document[] | null>(null);
  const documents = polledDocuments ?? initialDocuments;
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [reindexingId, setReindexingId] = useState<string | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildDialogOpen, setRebuildDialogOpen] = useState(false);

  // Lightweight polling during indexing — fetch JSON, not a full RSC re-render.
  // router.refresh() is called only once when indexing finishes to sync RSC state.
  useEffect(() => {
    if (!documents.some((d) => d.status === "pending")) return;
    const id = setInterval(async () => {
      const res = await fetch("/api/documents");
      const data = await res.json();
      setPolledDocuments(data.items);
      if (!data.items.some((d: Document) => d.status === "pending")) {
        router.refresh();
      }
    }, 3000);
    return () => clearInterval(id);
  }, [documents, router]);

  async function handleDelete(id: string) {
    const prev = polledDocuments ?? initialDocuments;
    setPolledDocuments(prev.filter((d) => d.id !== id));
    setDeletingId(id);
    try {
      await fetch(`/api/documents/${id}`, { method: "DELETE" });
      router.refresh();
    } catch {
      setPolledDocuments(prev);
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  }

  async function handleReindex(id: string) {
    const prev = polledDocuments ?? initialDocuments;
    setPolledDocuments(prev.map((d) => (d.id === id ? { ...d, status: "pending" } : d)));
    setReindexingId(id);
    try {
      await fetch(`/api/documents/${id}/reindex`, { method: "POST" });
      router.refresh();
    } catch {
      setPolledDocuments(prev);
    } finally {
      setReindexingId(null);
    }
  }

  async function handleRebuildAll() {
    setRebuilding(true);
    try {
      for (const doc of documents) {
        await fetch(`/api/documents/${doc.id}/reindex`, { method: "POST" });
      }
      setPolledDocuments(null);
      router.refresh();
    } finally {
      setRebuilding(false);
    }
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No documents yet. Upload some files above.
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end">
        <Button variant="outline" disabled={rebuilding} onClick={() => setRebuildDialogOpen(true)}>
          {rebuilding ? "Rebuilding…" : "Rebuild All"}
        </Button>
      </div>

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
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell className="font-medium max-w-50 truncate">{doc.name}</TableCell>
              <TableCell>{doc.lang}</TableCell>
              <TableCell>
                {doc.status === "pending" && doc.totalChunks
                  ? `${doc._count.chunks} / ${doc.totalChunks}`
                  : doc._count.chunks}
              </TableCell>
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
                  disabled={reindexingId === doc.id}
                  onClick={() => handleReindex(doc.id)}
                >
                  {reindexingId === doc.id ? "Reindexing…" : "Reindex"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deletingId === doc.id}
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
              disabled={!!deletingId}
              onClick={() => { if (deleteTarget) handleDelete(deleteTarget); }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rebuildDialogOpen} onOpenChange={setRebuildDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Rebuild all documents?</DialogTitle>
            <DialogDescription>
              This will re-embed every document. It may take a while and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="outline"
              disabled={rebuilding}
              onClick={() => {
                setRebuildDialogOpen(false);
                handleRebuildAll();
              }}
            >
              Rebuild All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
