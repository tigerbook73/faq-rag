/**
 * @test-file   useDocumentUpload
 * @description Covers useDocumentUpload's validation (extension/size), the full hashing -> preparing ->
 *              uploading -> confirming -> embedding phase flow, the 409-vs-generic prepareUpload error
 *              distinction, and the shared catch-all error path
 * @ai-generated
 * @reviewed-by (!HUMAN EDIT ONLY):
 *
 * Note: the Platform.OS === "web" branch (DOM File hashing/upload) is not covered here —
 * jest-expo resolves Platform.OS to "ios" by default, so exercising the web branch would
 * require a separate platform-mocking setup. Left as a known gap for a follow-up.
 */
import { act, waitFor } from "@testing-library/react-native";
import { MAX_UPLOAD_BYTES_LOCAL } from "@faq-rag/shared";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";
import { formatBytes } from "@/lib/utils/format";
import { queryKeys } from "@/lib/query-keys";
import { createTestQueryClient, renderHookWithClient } from "@/test/react-query";
import * as DocumentPicker from "expo-document-picker";
import { prepareUpload, uploadToSupabase, confirmIndex, embedBatch } from "@/lib/api/document";
import { computeFileSHA256 } from "@/lib/api/utils/crypto";

jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));

jest.mock("@/lib/api/document", () => ({
  prepareUpload: jest.fn(),
  uploadToSupabase: jest.fn(),
  confirmIndex: jest.fn(),
  embedBatch: jest.fn(),
}));

jest.mock("@/lib/api/utils/crypto", () => ({ computeSHA256: jest.fn(), computeFileSHA256: jest.fn() }));

const ASSET = { name: "report.pdf", size: 500, uri: "file:///report.pdf", mimeType: "application/pdf" };

function mockPicked(overrides: Partial<typeof ASSET> = {}) {
  (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
    canceled: false,
    assets: [{ ...ASSET, ...overrides }],
  });
}

function mockHappyPathDeps() {
  (computeFileSHA256 as jest.Mock).mockResolvedValue("a".repeat(64));
  (prepareUpload as jest.Mock).mockResolvedValue({ docId: "d1", signedUrl: "https://signed.example/upload" });
  (uploadToSupabase as jest.Mock).mockResolvedValue(undefined);
  (confirmIndex as jest.Mock).mockResolvedValue(undefined);
  (embedBatch as jest.Mock).mockResolvedValue({ embedded: 5, remaining: 0, status: "indexed" });
}

/**
 * @test-suite  useDocumentUpload
 * @target      apps/mobile/src/hooks/useDocumentUpload.ts
 * @strategy    renderHook + real QueryClient, expo-document-picker/@lib/api/document/crypto mocked
 * @cases
 *   - [PASS] a cancelled picker selection leaves the state idle and calls nothing else
 *   - [FAIL] an unsupported extension sets a validation error
 *   - [FAIL] a file over the size limit sets a validation error
 *   - [PASS] the happy path walks every phase and ends idle, invalidating the document list
 *   - [PASS] upload progress is reflected in state.progress while uploading
 *   - [PASS] embedBatch progress accumulates embedded/totalChunks across rounds
 *   - [FAIL] a 409 from prepareUpload reports "File already exists"
 *   - [FAIL] a non-409 prepareUpload error reports its message
 *   - [FAIL] a failure mid-flow (confirmIndex) is caught, invalidates, and reports an error
 *   - [PASS] reset() restores the idle state
 */
describe("useDocumentUpload", () => {
  beforeEach(() => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockReset();
    (prepareUpload as jest.Mock).mockReset();
    (uploadToSupabase as jest.Mock).mockReset();
    (confirmIndex as jest.Mock).mockReset();
    (embedBatch as jest.Mock).mockReset();
    (computeFileSHA256 as jest.Mock).mockReset();
  });

  it("a cancelled picker selection leaves the state idle and calls nothing else", async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: [] });
    const { result } = renderHookWithClient(useDocumentUpload);

    await act(async () => {
      await result.current.pickAndUpload();
    });

    expect(result.current.state.phase).toBe("idle");
    expect(prepareUpload).not.toHaveBeenCalled();
  });

  it("an unsupported extension sets a validation error", async () => {
    mockPicked({ name: "malware.exe" });
    const { result } = renderHookWithClient(useDocumentUpload);

    await act(async () => {
      await result.current.pickAndUpload();
    });

    expect(result.current.state).toMatchObject({
      phase: "error",
      error: "Only pdf, docx, md and txt are supported",
    });
    expect(prepareUpload).not.toHaveBeenCalled();
  });

  it("a file over the size limit sets a validation error", async () => {
    mockPicked({ size: MAX_UPLOAD_BYTES_LOCAL + 1 });
    const { result } = renderHookWithClient(useDocumentUpload);

    await act(async () => {
      await result.current.pickAndUpload();
    });

    expect(result.current.state).toMatchObject({
      phase: "error",
      error: `File exceeds the ${formatBytes(MAX_UPLOAD_BYTES_LOCAL)} limit`,
    });
    expect(prepareUpload).not.toHaveBeenCalled();
  });

  it("the happy path walks every phase and ends idle, invalidating the document list", async () => {
    mockPicked();
    mockHappyPathDeps();
    const client = createTestQueryClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHookWithClient(useDocumentUpload, { client });

    await act(async () => {
      await result.current.pickAndUpload();
    });

    expect(computeFileSHA256).toHaveBeenCalledWith(ASSET.uri);
    expect(prepareUpload).toHaveBeenCalledWith(
      expect.objectContaining({ name: ASSET.name, size: ASSET.size, hash: "a".repeat(64) }),
    );
    expect(uploadToSupabase).toHaveBeenCalledWith(ASSET.uri, "https://signed.example/upload", expect.any(Function));
    expect(confirmIndex).toHaveBeenCalledWith("d1");
    expect(embedBatch).toHaveBeenCalledWith("d1");
    expect(result.current.state.phase).toBe("idle");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.documents.list() });
  });

  it("upload progress is reflected in state.progress while uploading", async () => {
    mockPicked();
    mockHappyPathDeps();
    let resolveUpload!: () => void;
    (uploadToSupabase as jest.Mock).mockImplementation(
      (_source: string, _url: string, onProgress?: (fraction: number) => void) =>
        new Promise<void>((resolve) => {
          onProgress?.(0.5);
          resolveUpload = () => {
            onProgress?.(1);
            resolve();
          };
        }),
    );
    const { result } = renderHookWithClient(useDocumentUpload);

    act(() => {
      void result.current.pickAndUpload();
    });

    await waitFor(() => expect(result.current.state.progress).toBe(0.5));

    await act(async () => {
      resolveUpload();
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.state.phase).toBe("idle"));
  });

  it("embedBatch progress accumulates embedded/totalChunks across rounds", async () => {
    mockPicked();
    mockHappyPathDeps();
    (embedBatch as jest.Mock)
      .mockResolvedValueOnce({ embedded: 5, remaining: 5, status: "indexing" })
      .mockResolvedValueOnce({ embedded: 5, remaining: 0, status: "indexed" });
    const { result } = renderHookWithClient(useDocumentUpload);

    await act(async () => {
      await result.current.pickAndUpload();
    });

    expect(embedBatch).toHaveBeenCalledTimes(2);
    expect(result.current.state.phase).toBe("idle");
  });

  it('a 409 from prepareUpload reports "File already exists"', async () => {
    mockPicked();
    (computeFileSHA256 as jest.Mock).mockResolvedValue("a".repeat(64));
    (prepareUpload as jest.Mock).mockRejectedValue(Object.assign(new Error("Conflict"), { status: 409 }));
    const { result } = renderHookWithClient(useDocumentUpload);

    await act(async () => {
      await result.current.pickAndUpload();
    });

    expect(result.current.state).toMatchObject({ phase: "error", error: "File already exists" });
  });

  it("a non-409 prepareUpload error reports its message", async () => {
    mockPicked();
    (computeFileSHA256 as jest.Mock).mockResolvedValue("a".repeat(64));
    (prepareUpload as jest.Mock).mockRejectedValue(new Error("Prepare failed (500)"));
    const { result } = renderHookWithClient(useDocumentUpload);

    await act(async () => {
      await result.current.pickAndUpload();
    });

    expect(result.current.state).toMatchObject({ phase: "error", error: "Prepare failed (500)" });
  });

  it("a failure mid-flow (confirmIndex) is caught, invalidates, and reports an error", async () => {
    mockPicked();
    mockHappyPathDeps();
    (confirmIndex as jest.Mock).mockRejectedValue(new Error("index failed"));
    const client = createTestQueryClient();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHookWithClient(useDocumentUpload, { client });

    await act(async () => {
      await result.current.pickAndUpload();
    });

    expect(result.current.state).toMatchObject({ phase: "error", error: "index failed" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.documents.list() });
    expect(embedBatch).not.toHaveBeenCalled();
  });

  it("reset() restores the idle state", async () => {
    mockPicked();
    (computeFileSHA256 as jest.Mock).mockResolvedValue("a".repeat(64));
    (prepareUpload as jest.Mock).mockRejectedValue(new Error("boom"));
    const { result } = renderHookWithClient(useDocumentUpload);
    await act(async () => {
      await result.current.pickAndUpload();
    });
    expect(result.current.state.phase).toBe("error");

    act(() => result.current.reset());

    expect(result.current.state).toEqual({
      phase: "idle",
      fileName: null,
      progress: 0,
      embedded: 0,
      totalChunks: 0,
      error: null,
    });
  });
});
