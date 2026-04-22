import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

let extractor: FeatureExtractionPipeline | null = null;

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractor) {
    const modelName = process.env.EMBEDDING_MODEL ?? "Xenova/bge-m3";
    extractor = await pipeline("feature-extraction", modelName, {
      dtype: "fp32",
    });
  }
  return extractor;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const ext = await getExtractor();
  const output = await ext(text, { pooling: "cls", normalize: true });
  return Array.from(output.data as Float32Array);
}
