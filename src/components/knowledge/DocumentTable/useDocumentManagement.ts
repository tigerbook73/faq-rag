"use client";

import { useState, useMemo, useCallback } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { config } from "@/lib/config";
import { type DocumentItem as Document } from "@/lib/schemas/document";

const ACTIVE_STATUSES = new Set(["pending", "uploaded", "indexing"]);

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
      await fetch(`/api/documents/${id}`, { method: "DELETE" });
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
      const res = await fetch(`/api/documents/${id}/reindex`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Reindex failed (${res.status})`);
      }
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
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Visibility update failed (${res.status})`);
      }
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
        const res = await fetch(`/api/documents/${documents[i].id}/reindex`, { method: "POST" });
        if (!res.ok) failed++;
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
