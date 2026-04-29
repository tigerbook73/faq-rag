"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { POLL_INTERVAL_MS } from "@/lib/config";
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
  const [search, setSearch] = useState("");
  const allDocuments = polledDocuments ?? initialDocuments;
  const documents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? allDocuments.filter((d) => d.name.toLowerCase().includes(q)) : allDocuments;
  }, [allDocuments, search]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [reindexingId, setReindexingId] = useState<string | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildProgress, setRebuildProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
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
    }, POLL_INTERVAL_MS);
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
    setRebuildProgress({ done: 0, total: documents.length });
    try {
      for (let i = 0; i < documents.length; i++) {
        await fetch(`/api/documents/${documents[i].id}/reindex`, {
          method: "POST",
        });
        setRebuildProgress({ done: i + 1, total: documents.length });
      }
      setPolledDocuments(null);
      router.refresh();
    } finally {
      setRebuilding(false);
      setRebuildProgress(null);
    }
  }

  if (allDocuments.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">No documents yet. Upload some files above.</div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Search documents…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="sm:ml-auto">
          <Button
            variant="outline"
            disabled={rebuilding}
            onClick={() => setRebuildDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            {rebuildProgress ? `Rebuilding ${rebuildProgress.done}/${rebuildProgress.total}…` : "Rebuild All"}
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Lang</TableHead>
            <TableHead className="hidden sm:table-cell">Chunks</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Uploaded</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground py-8 text-center text-sm">
                No documents match &ldquo;{search}&rdquo;
              </TableCell>
            </TableRow>
          )}
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell className="max-w-32 truncate font-medium sm:max-w-50">{doc.name}</TableCell>
              <TableCell className="hidden sm:table-cell">{doc.lang}</TableCell>
              <TableCell className="hidden sm:table-cell">
                {doc.status === "pending" && doc.totalChunks
                  ? `${doc._count.chunks} / ${doc.totalChunks}`
                  : doc._count.chunks}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(doc.status)}>{doc.status}</Badge>
                {doc.status === "failed" && doc.errorMsg && (
                  <p className="text-destructive mt-1 max-w-48 text-xs break-words">{doc.errorMsg}</p>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground hidden text-xs lg:table-cell">
                {new Date(doc.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="space-x-2 text-right">
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

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete document?</DialogTitle>
            <DialogDescription>This will permanently remove the document and all its indexed chunks.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              disabled={!!deletingId}
              onClick={() => {
                if (deleteTarget) handleDelete(deleteTarget);
              }}
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
