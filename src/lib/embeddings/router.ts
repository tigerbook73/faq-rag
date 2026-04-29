import { IS_CLOUD } from "../config";

const INDEXING_BATCH_SIZE = 8;

export async function getEmbedding(text: string): Promise<number[]> {
  if (IS_CLOUD) {
    const { getEmbeddingOpenAI } = await import("./openai-embed");
    return getEmbeddingOpenAI(text);
  }
  const { getEmbedding: getEmbeddingBge } = await import("./bge");
  return getEmbeddingBge(text);
}

export async function getEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  if (IS_CLOUD) {
    const { getEmbeddingsBatchOpenAI } = await import("./openai-embed");
    return getEmbeddingsBatchOpenAI(texts);
  }
  const { getEmbeddingsBatch: getEmbeddingsBatchBge } = await import("./bge");
  return getEmbeddingsBatchBge(texts);
}

// For indexing: API mode sends all texts in one request; local mode batches
// ONNX inference in groups of INDEXING_BATCH_SIZE with event-loop yields between.
export async function embedBatchForIndexing(texts: string[]): Promise<number[][]> {
  if (IS_CLOUD) {
    const { getEmbeddingsBatchOpenAI } = await import("./openai-embed");
    return getEmbeddingsBatchOpenAI(texts);
  }
  const { getEmbeddingsBatch: batchBge } = await import("./bge");
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += INDEXING_BATCH_SIZE) {
    await new Promise<void>((r) => setImmediate(r));
    const batch = await batchBge(texts.slice(i, i + INDEXING_BATCH_SIZE));
    results.push(...batch);
  }
  return results;
}
