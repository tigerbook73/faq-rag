// Retrieval
export const RETRIEVAL_TOP_K = 10;       // candidates per language from vector search
export const RETRIEVAL_TOP_FINAL = 6;    // chunks sent to LLM after cross-encoder rerank
export const QUERY_MAX_TOKENS = 200;     // max tokens for translation / HyDE generation

// LLM
export const LLM_MAX_TOKENS = 2048;      // max tokens for chat completion responses
export const HISTORY_TOKEN_BUDGET = 6000; // max estimated tokens kept from conversation history

// Chunking
export const CHUNK_SIZE = 800;           // characters per chunk
export const CHUNK_OVERLAP = 120;        // overlap between adjacent chunks
export const SEMANTIC_THRESHOLD = 0.75;  // cosine similarity below this value marks a chunk boundary

// UI
export const POLL_INTERVAL_MS = 3000;    // document status polling interval
