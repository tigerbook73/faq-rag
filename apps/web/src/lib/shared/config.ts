import {
  type Provider,
  DEFAULT_PROVIDER,
  MAX_UPLOAD_BYTES_CLOUD,
  MAX_UPLOAD_BYTES_LOCAL,
  POLL_INTERVAL_MS,
} from "@faq-rag/shared";

export const config = {
  embedding: {
    provider: process.env.EMBEDDING_PROVIDER ?? "local", // "local" | "openai"
    useOpenAI: process.env.EMBEDDING_PROVIDER === "openai",
    maxBytesCloud: MAX_UPLOAD_BYTES_CLOUD,
    maxBytesLocal: MAX_UPLOAD_BYTES_LOCAL,
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
    defaultProvider: (process.env.NEXT_PUBLIC_DEFAULT_PROVIDER || DEFAULT_PROVIDER) as Provider,
  },
  chunking: {
    size: 800,
    overlap: 120,
    semanticThreshold: 0.75,
  },
  ui: {
    pollIntervalMs: POLL_INTERVAL_MS,
  },
} as const;
