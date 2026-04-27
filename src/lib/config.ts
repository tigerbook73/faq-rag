// Retrieval
export const RETRIEVAL_TOP_K = 10;       // candidates per language from vector search
export const RETRIEVAL_TOP_FINAL = 6;    // chunks sent to LLM after cross-encoder rerank
export const QUERY_MAX_TOKENS = 200;     // max tokens for translation / HyDE generation

// LLM
export const LLM_MAX_TOKENS = 2048;      // max tokens for chat completion responses

// Chunking
export const CHUNK_SIZE = 800;           // characters per chunk
export const CHUNK_OVERLAP = 120;        // overlap between adjacent chunks

// UI
export const POLL_INTERVAL_MS = 3000;    // document status polling interval
