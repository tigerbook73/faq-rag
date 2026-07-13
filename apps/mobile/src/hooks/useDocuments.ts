import { useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { POLL_INTERVAL_MS, type DocumentItem } from "@faq-rag/shared";
import { listDocuments, deleteDocument, reindexDocument, embedBatch } from "@/lib/api/document";
import { queryKeys } from "@/lib/query-keys";
import { logger } from "@/lib/logger";

const ACTIVE_STATUSES = new Set<DocumentItem["status"]>(["pending", "uploaded", "indexing"]);

type DocumentsData = { items: DocumentItem[]; total: number };

// Mirrors apps/web's useDocumentManagement + embed-service-context: list
// query with polling while any document is mid-pipeline, optimistic delete,
// and a reindex → embedBatch loop until the document leaves "indexing".
export function useDocuments() {
  const queryClient = useQueryClient();
  const { data, error, isLoading, refetch } = useQuery<DocumentsData>({
    queryKey: queryKeys.documents.list(),
    queryFn: () => listDocuments(),
    // Must return `false` (not `0`) to stop polling — a `0` interval is
    // treated as "refetch every 0ms" rather than "disabled".
    refetchInterval: (query) =>
      query.state.data?.items.some((d) => ACTIVE_STATUSES.has(d.status)) ? POLL_INTERVAL_MS : false,
  });

  // Guards against launching two embed loops for the same document.
  const embeddingRef = useRef(new Set<string>());

  const runEmbedLoop = useCallback(
    async (docId: string) => {
      if (embeddingRef.current.has(docId)) return;
      embeddingRef.current.add(docId);
      try {
        while (true) {
          const result = await embedBatch(docId);
          if (result.remaining === 0 || result.status !== "indexing") break;
        }
      } catch (err) {
        // The revalidate below surfaces the failed status; nothing else to do.
        logger.warn("Embed loop failed:", err instanceof Error ? err.message : String(err));
      } finally {
        embeddingRef.current.delete(docId);
        // Single refresh when the loop exits; intermediate progress is already
        // covered by the 3s poll while the document is "indexing".
        void queryClient.invalidateQueries({ queryKey: queryKeys.documents.list() });
      }
    },
    [queryClient],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      queryClient.setQueryData<DocumentsData>(queryKeys.documents.list(), (current) =>
        current ? { ...current, items: current.items.filter((d) => d.id !== id) } : current,
      );
      try {
        await deleteDocument(id);
        await queryClient.invalidateQueries({ queryKey: queryKeys.documents.list() });
      } catch (err) {
        logger.warn("Failed to delete document:", err instanceof Error ? err.message : String(err));
        await queryClient.invalidateQueries({ queryKey: queryKeys.documents.list() });
      }
    },
    [queryClient],
  );

  const handleReindex = useCallback(
    async (id: string) => {
      queryClient.setQueryData<DocumentsData>(queryKeys.documents.list(), (current) =>
        current
          ? { ...current, items: current.items.map((d) => (d.id === id ? { ...d, status: "pending" as const } : d)) }
          : current,
      );
      try {
        await reindexDocument(id);
        await queryClient.invalidateQueries({ queryKey: queryKeys.documents.list() });
        void runEmbedLoop(id);
      } catch (err) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.documents.list() });
        throw err;
      }
    },
    [queryClient, runEmbedLoop],
  );

  return {
    documents: data?.items ?? [],
    error: error instanceof Error ? error.message : undefined,
    isLoading,
    refetch,
    handleDelete,
    handleReindex,
    runEmbedLoop,
  };
}
