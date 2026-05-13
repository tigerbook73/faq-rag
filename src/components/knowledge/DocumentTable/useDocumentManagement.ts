"use client";

import { useState, useMemo, useCallback } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { config } from "@/lib/shared/config";
import { type DocumentItem as Document } from "@/lib/shared/schemas/document";
import { deleteDocument, reindexDocument, updateDocumentVisibility } from "@/lib/client/documents-api";
import { fetcher } from "@/lib/client/swr";

const ACTIVE_STATUSES = new Set(["pending", "uploaded", "indexing"]);

export function useDocumentManagement() {
  const { data, mutate: mutateDocuments } = useSWR<{ items: Document[] }>("/api/documents", fetcher);
  const baseDocuments = useMemo(() => data?.items ?? [], [data]);

  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [reindexingId, setReindexingId] = useState<string | null>(null);
  const [visibilityUpdatingId, setVisibilityUpdatingId] = useState<string | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [rebuildProgress, setRebuildProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [rebuildDialogOpen, setRebuildDialogOpen] = useState(false);

  const documents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? baseDocuments.filter((d) => d.name.toLowerCase().includes(q)) : baseDocuments;
  }, [baseDocuments, search]);

  const fetchDocuments = useCallback(async () => {
    await mutateDocuments();
  }, [mutateDocuments]);

  const handleManualRefresh = useCallback(async () => {
    setIsManualRefreshing(true);
    try {
      await mutateDocuments();
      toast.success("Table refreshed");
    } catch {
      toast.error("Refresh failed");
    } finally {
      setIsManualRefreshing(false);
    }
  }, [mutateDocuments]);

  const hasActiveDocs = baseDocuments.some((d) => ACTIVE_STATUSES.has(d.status));

  // Use SWR's built-in refreshInterval for polling when there are active docs
  useSWR<{ items: Document[] }>(hasActiveDocs ? "/api/documents" : null, fetcher, {
    refreshInterval: config.ui.pollIntervalMs,
  });

  async function handleDelete(id: string) {
    mutateDocuments((current) => (current ? { items: current.items.filter((d) => d.id !== id) } : current), false);
    setDeletingId(id);
    try {
      await deleteDocument(id);
      await mutateDocuments();
    } catch {
      await mutateDocuments();
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  }

  async function handleReindex(id: string) {
    mutateDocuments(
      (current) =>
        current
          ? { items: current.items.map((d) => (d.id === id ? { ...d, status: "pending" as Document["status"] } : d)) }
          : current,
      false,
    );
    setReindexingId(id);
    try {
      await reindexDocument(id);
      await mutateDocuments();
    } catch (err) {
      await mutateDocuments();
      toast.error(err instanceof Error ? err.message : "Reindex failed");
    } finally {
      setReindexingId(null);
    }
  }

  async function handleVisibilityChange(id: string, visibility: "private" | "public") {
    const target = baseDocuments.find((d) => d.id === id);
    if (!target || target.visibility === visibility) return;

    mutateDocuments(
      (current) => (current ? { items: current.items.map((d) => (d.id === id ? { ...d, visibility } : d)) } : current),
      false,
    );
    setVisibilityUpdatingId(id);
    try {
      await updateDocumentVisibility(id, visibility);
      await mutateDocuments();
      toast.success(`Document is now ${visibility}`);
    } catch (err) {
      await mutateDocuments();
      toast.error(err instanceof Error ? err.message : "Visibility update failed");
    } finally {
      setVisibilityUpdatingId(null);
    }
  }

  async function handleRebuildAll() {
    setRebuilding(true);
    setRebuildProgress({ done: 0, total: documents.length });
    let failed = 0;
    try {
      for (let i = 0; i < documents.length; i++) {
        try { await reindexDocument(documents[i].id); } catch { failed++; }
        setRebuildProgress({ done: i + 1, total: documents.length });
      }
      await mutateDocuments();
      if (failed > 0) toast.error(`${failed} document${failed > 1 ? "s" : ""} failed to reindex`);
    } catch {
      toast.error("Rebuild interrupted");
      await mutateDocuments();
    } finally {
      setRebuilding(false);
      setRebuildProgress(null);
    }
  }

  return {
    documents,
    allDocuments: baseDocuments,
    search,
    setSearch,
    deletingId,
    deleteTarget,
    setDeleteTarget,
    reindexingId,
    visibilityUpdatingId,
    rebuilding,
    rebuildProgress,
    rebuildDialogOpen,
    setRebuildDialogOpen,
    isManualRefreshing,
    handleDelete,
    handleReindex,
    handleVisibilityChange,
    handleRebuildAll,
    handleManualRefresh,
    fetchDocuments,
  };
}
