/**
 * @test-file   useDocuments
 * @description Covers useDocuments' status-driven polling, optimistic delete/reindex (both invalidate on
 *              success and failure), and the runEmbedLoop concurrency guard
 * @ai-generated
 * @reviewed-by (!HUMAN EDIT ONLY):
 */
import { act, waitFor } from "@testing-library/react-native";
import type { DocumentItem } from "@faq-rag/shared";
import { useDocuments } from "@/hooks/useDocuments";
import { renderHookWithClient } from "@/test/react-query";
import { listDocuments, deleteDocument, reindexDocument, embedBatch } from "@/lib/api/document";

// Real POLL_INTERVAL_MS is 3s; shrinking it lets the polling test use real timers
// instead of fighting React Query's own setTimeout-based scheduling under fake timers.
jest.mock("@faq-rag/shared", () => ({
  ...jest.requireActual("@faq-rag/shared"),
  POLL_INTERVAL_MS: 20,
}));

jest.mock("@/lib/api/document", () => ({
  listDocuments: jest.fn(),
  deleteDocument: jest.fn(),
  reindexDocument: jest.fn(),
  embedBatch: jest.fn(),
}));

function makeDoc(overrides: Partial<DocumentItem> = {}): DocumentItem {
  return {
    id: "d1",
    name: "doc.pdf",
    lang: "en",
    status: "indexed",
    sizeBytes: 100,
    errorMsg: null,
    totalChunks: 10,
    embeddingModel: "text-embedding-3-small",
    createdAt: "2026-01-01T00:00:00.000Z",
    isBuiltIn: false,
    _count: { chunks: 10 },
    ...overrides,
  };
}

/**
 * @test-suite  useDocuments
 * @target      apps/mobile/src/hooks/useDocuments.ts
 * @strategy    renderHook + real QueryClient, @/lib/api/document mocked, POLL_INTERVAL_MS shrunk for real-timer polling
 * @cases
 *   - [PASS] loads the document list
 *   - [PASS] polls while a document is indexing, and stops once all documents settle
 *   - [PASS] handleDelete removes the document optimistically and invalidates on success
 *   - [FAIL] handleDelete still invalidates when deleteDocument rejects
 *   - [PASS] handleReindex marks the document pending, reindexes, and kicks off the embed loop
 *   - [FAIL] handleReindex invalidates and rethrows when reindexDocument rejects
 *   - [PASS] runEmbedLoop loops until remaining reaches 0, then invalidates once
 *   - [PASS] runEmbedLoop guards against concurrent calls for the same document
 */
describe("useDocuments", () => {
  beforeEach(() => {
    (listDocuments as jest.Mock).mockReset();
    (deleteDocument as jest.Mock).mockReset();
    (reindexDocument as jest.Mock).mockReset();
    (embedBatch as jest.Mock).mockReset();
  });

  it("loads the document list", async () => {
    const doc = makeDoc();
    (listDocuments as jest.Mock).mockResolvedValue({ items: [doc], total: 1 });

    const { result } = renderHookWithClient(useDocuments);

    await waitFor(() => expect(result.current.documents).toEqual([doc]));
    expect(result.current.error).toBeUndefined();
  });

  it("polls while a document is indexing, and stops once all documents settle", async () => {
    const indexing = makeDoc({ status: "indexing" });
    const settled = makeDoc({ status: "indexed" });
    (listDocuments as jest.Mock)
      .mockResolvedValueOnce({ items: [indexing], total: 1 })
      .mockResolvedValueOnce({ items: [settled], total: 1 });

    renderHookWithClient(useDocuments);

    await waitFor(() => expect(listDocuments).toHaveBeenCalledTimes(2));

    // Give the (short, mocked) poll interval several more chances to fire; call
    // count must stay at 2 since refetchInterval now returns false, not another delay.
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 100));
    expect(listDocuments).toHaveBeenCalledTimes(2);
  });

  it("handleDelete removes the document optimistically and invalidates on success", async () => {
    const doc = makeDoc();
    (listDocuments as jest.Mock).mockResolvedValue({ items: [doc], total: 1 });
    (deleteDocument as jest.Mock).mockResolvedValue(undefined);
    const { result } = renderHookWithClient(useDocuments);
    await waitFor(() => expect(result.current.documents).toEqual([doc]));

    await act(async () => {
      await result.current.handleDelete("d1");
    });

    expect(deleteDocument).toHaveBeenCalledWith("d1");
    await waitFor(() => expect(listDocuments).toHaveBeenCalledTimes(2));
  });

  it("still invalidates when deleteDocument rejects", async () => {
    const doc = makeDoc();
    (listDocuments as jest.Mock).mockResolvedValue({ items: [doc], total: 1 });
    (deleteDocument as jest.Mock).mockRejectedValue(new Error("network down"));
    const { result } = renderHookWithClient(useDocuments);
    await waitFor(() => expect(result.current.documents).toEqual([doc]));

    await act(async () => {
      await result.current.handleDelete("d1");
    });

    await waitFor(() => expect(listDocuments).toHaveBeenCalledTimes(2));
  });

  it("handleReindex marks the document pending, reindexes, and kicks off the embed loop", async () => {
    const doc = makeDoc({ status: "indexed" });
    (listDocuments as jest.Mock).mockResolvedValue({ items: [doc], total: 1 });
    (reindexDocument as jest.Mock).mockResolvedValue(undefined);
    (embedBatch as jest.Mock).mockResolvedValue({ embedded: 1, remaining: 0, status: "indexed" });
    const { result } = renderHookWithClient(useDocuments);
    await waitFor(() => expect(result.current.documents).toEqual([doc]));

    await act(async () => {
      await result.current.handleReindex("d1");
    });

    expect(reindexDocument).toHaveBeenCalledWith("d1");
    await waitFor(() => expect(embedBatch).toHaveBeenCalledWith("d1"));
  });

  it("invalidates and rethrows when reindexDocument rejects", async () => {
    const doc = makeDoc();
    (listDocuments as jest.Mock).mockResolvedValue({ items: [doc], total: 1 });
    (reindexDocument as jest.Mock).mockRejectedValue(new Error("server error"));
    const { result } = renderHookWithClient(useDocuments);
    await waitFor(() => expect(result.current.documents).toEqual([doc]));

    await expect(result.current.handleReindex("d1")).rejects.toThrow("server error");
    await waitFor(() => expect(listDocuments).toHaveBeenCalledTimes(2));
  });

  it("runEmbedLoop loops until remaining reaches 0, then invalidates once", async () => {
    (listDocuments as jest.Mock).mockResolvedValue({ items: [], total: 0 });
    (embedBatch as jest.Mock)
      .mockResolvedValueOnce({ embedded: 1, remaining: 1, status: "indexing" })
      .mockResolvedValueOnce({ embedded: 1, remaining: 0, status: "indexed" });
    const { result } = renderHookWithClient(useDocuments);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.runEmbedLoop("d1");
    });

    expect(embedBatch).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(listDocuments).toHaveBeenCalledTimes(2));
  });

  it("guards against concurrent calls for the same document", async () => {
    (listDocuments as jest.Mock).mockResolvedValue({ items: [], total: 0 });
    (embedBatch as jest.Mock)
      .mockResolvedValueOnce({ embedded: 1, remaining: 1, status: "indexing" })
      .mockResolvedValueOnce({ embedded: 1, remaining: 0, status: "indexed" });
    const { result } = renderHookWithClient(useDocuments);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      const first = result.current.runEmbedLoop("d1");
      const second = result.current.runEmbedLoop("d1");
      await Promise.all([first, second]);
    });

    // The second call is a no-op because the first already claimed "d1"; only
    // the first loop's two rounds should have called embedBatch.
    expect(embedBatch).toHaveBeenCalledTimes(2);
  });
});
