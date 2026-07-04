import { useCallback, useRef } from "react";
import useSWR, { mutate as swrMutate } from "swr";
import type { DocumentItem } from "@faq-rag/shared";
import { listDocuments, deleteDocument, reindexDocument, embedBatch } from "../lib/api/document";

const SWR_KEY = "/api/documents";
// Matches apps/web/src/lib/shared/config.ts's ui.pollIntervalMs.
const POLL_INTERVAL_MS = 3000;

const ACTIVE_STATUSES = new Set<DocumentItem["status"]>(["pending", "uploaded", "indexing"]);

type DocumentsData = { items: DocumentItem[]; total: number };

// Mirrors apps/web's useDocumentManagement + embed-service-context: SWR list
// with polling while any document is mid-pipeline, optimistic delete, and a
// reindex → embedBatch loop until the document leaves "indexing".
export function useDocuments() {
  const { data, isLoading, mutate } = useSWR<DocumentsData>(SWR_KEY, () => listDocuments(), {
    refreshInterval: (latest) => (latest?.items.some((d) => ACTIVE_STATUSES.has(d.status)) ? POLL_INTERVAL_MS : 0),
  });

  // Guards against launching two embed loops for the same document.
  const embeddingRef = useRef(new Set<string>());

  const runEmbedLoop = useCallback(async (docId: string) => {
    if (embeddingRef.current.has(docId)) return;
    embeddingRef.current.add(docId);
    try {
      while (true) {
        const result = await embedBatch(docId);
        void swrMutate(SWR_KEY);
        if (result.remaining === 0 || result.status !== "indexing") break;
      }
    } catch {
      void swrMutate(SWR_KEY);
    } finally {
      embeddingRef.current.delete(docId);
    }
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      void mutate(
        (current) => (current ? { ...current, items: current.items.filter((d) => d.id !== id) } : current),
        false,
      );
      try {
        await deleteDocument(id);
        await mutate();
      } catch {
        await mutate();
      }
    },
    [mutate],
  );

  const handleReindex = useCallback(
    async (id: string) => {
      void mutate(
        (current) =>
          current
            ? { ...current, items: current.items.map((d) => (d.id === id ? { ...d, status: "pending" as const } : d)) }
            : current,
        false,
      );
      try {
        await reindexDocument(id);
        await mutate();
        void runEmbedLoop(id);
      } catch (err) {
        await mutate();
        throw err;
      }
    },
    [mutate, runEmbedLoop],
  );

  return {
    documents: data?.items ?? [],
    isLoading,
    mutate,
    handleDelete,
    handleReindex,
    runEmbedLoop,
  };
}
