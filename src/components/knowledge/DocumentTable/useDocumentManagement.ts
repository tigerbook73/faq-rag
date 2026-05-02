"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { config } from "@/lib/config";
import { type Document } from "@/components/knowledge/DocumentRow";

const ACTIVE_STATUSES = new Set(["pending", "uploaded", "indexing"]);

export function useDocumentManagement(initialDocuments: Document[]) {
  const router = useRouter();
  const [polledDocuments, setPolledDocuments] = useState<Document[] | null>(null);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [reindexingId, setReindexingId] = useState<string | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [rebuildProgress, setRebuildProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [rebuildDialogOpen, setRebuildDialogOpen] = useState(false);

  const allDocuments = polledDocuments ?? initialDocuments;

  const documents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? allDocuments.filter((d) => d.name.toLowerCase().includes(q)) : allDocuments;
  }, [allDocuments, search]);

  // Track active document IDs to detect completion
  const lastActiveIdsRef = useRef<Set<string>>(new Set());

  const fetchDocuments = useCallback(async () => {
    const res = await fetch("/api/documents");
    const data = await res.json();
    const newDocs = data.items as Document[];
    setPolledDocuments(newDocs);
    return newDocs;
  }, []);

  const handleManualRefresh = useCallback(async () => {
    setIsManualRefreshing(true);
    try {
      await fetchDocuments();
      router.refresh();
      toast.success("Table refreshed");
    } catch {
      toast.error("Refresh failed");
    } finally {
      setIsManualRefreshing(false);
    }
  }, [fetchDocuments, router]);

  // Polling logic with improved refresh behavior (Roadmap 2.5)
  useEffect(() => {
    const currentActive = documents.filter((d) => ACTIVE_STATUSES.has(d.status));
    const currentActiveIds = new Set(currentActive.map((d) => d.id));

    // Update ref with current active if it's the first run or we have active docs
    if (currentActiveIds.size > 0 || lastActiveIdsRef.current.size > 0) {
      // We only start polling if there are active docs
      if (currentActiveIds.size === 0 && lastActiveIdsRef.current.size === 0) {
        return;
      }
    } else {
      return;
    }

    const id = setInterval(async () => {
      const latestDocs = await fetchDocuments();

      const latestActiveIds = new Set(
        latestDocs.filter((d: Document) => ACTIVE_STATUSES.has(d.status)).map((d: Document) => d.id),
      );

      // Check if any document that was active is now terminal
      let anyFinished = false;
      for (const docId of lastActiveIdsRef.current) {
        if (!latestActiveIds.has(docId)) {
          anyFinished = true;
          break;
        }
      }

      lastActiveIdsRef.current = latestActiveIds;

      if (anyFinished) {
        router.refresh();
      }
    }, config.ui.pollIntervalMs);

    return () => clearInterval(id);
  }, [documents, fetchDocuments, router]);

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
      const res = await fetch(`/api/documents/${id}/reindex`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Reindex failed (${res.status})`);
      }
      router.refresh();
    } catch (err) {
      setPolledDocuments(prev);
      toast.error(err instanceof Error ? err.message : "Reindex failed");
    } finally {
      setReindexingId(null);
    }
  }

  async function handleRebuildAll() {
    setRebuilding(true);
    setRebuildProgress({ done: 0, total: documents.length });
    let failed = 0;
    try {
      for (let i = 0; i < documents.length; i++) {
        const res = await fetch(`/api/documents/${documents[i].id}/reindex`, { method: "POST" });
        if (!res.ok) failed++;
        setRebuildProgress({ done: i + 1, total: documents.length });
      }
      setPolledDocuments(null);
      router.refresh();
      if (failed > 0) toast.error(`${failed} document${failed > 1 ? "s" : ""} failed to reindex`);
    } catch {
      toast.error("Rebuild interrupted");
      router.refresh();
    } finally {
      setRebuilding(false);
      setRebuildProgress(null);
    }
  }

  return {
    documents,
    allDocuments,
    search,
    setSearch,
    deletingId,
    deleteTarget,
    setDeleteTarget,
    reindexingId,
    rebuilding,
    rebuildProgress,
    rebuildDialogOpen,
    setRebuildDialogOpen,
    isManualRefreshing,
    handleDelete,
    handleReindex,
    handleRebuildAll,
    handleManualRefresh,
  };
}
