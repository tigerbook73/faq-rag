import type { ChunkRow } from "./vector-search";

// ── mocks (must be declared before any imports that use them) ──────────────
const mockGetEmbedding = jest.fn().mockResolvedValue(new Array(1024).fill(0.1));
const mockVectorSearch = jest.fn();
const mockRerankChunks = jest.fn();
const mockDetectLang = jest.fn().mockReturnValue("en");
const mockCreate = jest.fn();

jest.mock("@/lib/embeddings/bge", () => ({
  getEmbedding: (...args: unknown[]) => mockGetEmbedding(...args),
}));
jest.mock("@/lib/retrieval/vector-search", () => ({
  vectorSearch: (...args: unknown[]) => mockVectorSearch(...args),
}));
jest.mock("@/lib/retrieval/cross-encoder", () => ({
  rerankChunks: (...args: unknown[]) => mockRerankChunks(...args),
}));
jest.mock("@/lib/lang/detect", () => ({
  detectLang: (...args: unknown[]) => mockDetectLang(...args),
}));
jest.mock("@/lib/llm/clients", () => ({
  deepseekClient: {
    chat: { completions: { create: (...args: unknown[]) => mockCreate(...args) } },
  },
}));

import { retrieve } from "./query";

// ── helpers ────────────────────────────────────────────────────────────────
function makeChunk(id: string, score = 0.9): ChunkRow {
  return { id, document_id: "doc1", ord: 0, content: `content-${id}`, lang: "en", score, document_name: "doc.txt" };
}

function mockLLMResponse(text: string) {
  mockCreate.mockResolvedValue({ choices: [{ message: { content: text } }] });
}

// ── tests ──────────────────────────────────────────────────────────────────
describe("retrieve()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDetectLang.mockReturnValue("en");
    mockVectorSearch.mockResolvedValue([makeChunk("c1")]);
    mockRerankChunks.mockImplementation((_q: string, chunks: ChunkRow[], n: number) =>
      Promise.resolve(chunks.slice(0, n)),
    );
    mockLLMResponse("translated text");
  });

  it("returns chunks from cross-encoder reranker", async () => {
    const chunks = await retrieve("What is RAG?");
    expect(mockRerankChunks).toHaveBeenCalledTimes(1);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it("calls getEmbedding 3 times (original + translation + HyDE)", async () => {
    await retrieve("What is RAG?");
    expect(mockGetEmbedding).toHaveBeenCalledTimes(3);
  });

  it("falls back to original query when translation fails", async () => {
    mockCreate
      .mockRejectedValueOnce(new Error("API error")) // translation fails
      .mockResolvedValueOnce({ choices: [{ message: { content: "hypothetical answer" } }] }); // HyDE succeeds
    await retrieve("What is RAG?");
    // Should still complete without throwing
    expect(mockRerankChunks).toHaveBeenCalledTimes(1);
  });

  it("still returns results when HyDE generation fails", async () => {
    mockCreate
      .mockResolvedValueOnce({ choices: [{ message: { content: "translated" } }] }) // translation ok
      .mockRejectedValueOnce(new Error("HyDE error")); // HyDE fails
    const chunks = await retrieve("What is RAG?");
    // HyDE vector search is skipped but bi-encoder results still returned
    expect(chunks).toBeDefined();
    expect(mockRerankChunks).toHaveBeenCalledTimes(1);
  });

  it("deduplicates chunks with the same id from multiple vector searches", async () => {
    const duplicate = makeChunk("dup-id", 0.9);
    mockVectorSearch.mockResolvedValue([duplicate]);
    // 3 searches all return the same chunk → dedup → 1 unique chunk passed to reranker
    mockRerankChunks.mockImplementation((_q: string, chunks: ChunkRow[], n: number) =>
      Promise.resolve(chunks.slice(0, n)),
    );
    await retrieve("test query");
    const [, candidates] = mockRerankChunks.mock.calls[0] as [string, ChunkRow[], number];
    const ids = candidates.map((c: ChunkRow) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
