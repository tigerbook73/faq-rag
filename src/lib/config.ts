export const config = {
  embedding: {
    provider: process.env.EMBEDDING_PROVIDER ?? "local", // "local" | "openai"
    useOpenAI: process.env.EMBEDDING_PROVIDER === "openai",
    maxBytesCloud: 50 * 1024, // 50 KB
    maxBytesLocal: 1 * 1024 * 1024, // 1 MB
  },
  retrieval: {
    topK: 10, // candidates per language from vector search
    topFinal: 6, // chunks sent to LLM after rerank
    queryMaxTokens: 200,
    enableReranker: process.env.ENABLE_RERANKER === "true",
  },
  llm: {
    maxTokens: 2048,
    historyTokenBudget: 6000,
  },
  chunking: {
    size: 800,
    overlap: 120,
    semanticThreshold: 0.75,
  },
  ui: {
    pollIntervalMs: 3000,
  },
} as const;
