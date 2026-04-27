import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

const MODEL_NAME = process.env.EMBEDDING_MODEL ?? "Xenova/bge-m3";

let initPromise: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor(): Promise<FeatureExtractionPipeline> {
  initPromise ??= pipeline("feature-extraction", MODEL_NAME, { dtype: "fp32" });
  return initPromise;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const ext = await getExtractor();
  const output = await ext(text, { pooling: "cls", normalize: true });
  return Array.from(output.data as Float32Array);
}

export async function getEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const ext = await getExtractor();
  const output = await ext(texts, { pooling: "cls", normalize: true });
  const data = output.data as Float32Array;
  const dim = data.length / texts.length;
  return Array.from({ length: texts.length }, (_, i) =>
    Array.from(data.subarray(i * dim, (i + 1) * dim))
  );
}
