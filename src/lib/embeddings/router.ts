import { IS_CLOUD } from "../config";

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
