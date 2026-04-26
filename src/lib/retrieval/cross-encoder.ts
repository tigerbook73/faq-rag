import {
  AutoTokenizer,
  AutoModelForSequenceClassification,
} from "@huggingface/transformers";
import type { ChunkRow } from "./vector-search";

const MODEL_NAME = process.env.RERANKER_MODEL ?? "Xenova/bge-reranker-base";

interface RerankerBundle {
  tokenizer: Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>;
  model: Awaited<ReturnType<typeof AutoModelForSequenceClassification.from_pretrained>>;
}

let initPromise: Promise<RerankerBundle> | null = null;

function getReranker(): Promise<RerankerBundle> {
  initPromise ??= (async () => {
    const [tokenizer, model] = await Promise.all([
      AutoTokenizer.from_pretrained(MODEL_NAME),
      AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, { dtype: "fp32" }),
    ]);
    return { tokenizer, model };
  })();
  return initPromise;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export async function rerankChunks(
  query: string,
  chunks: ChunkRow[],
  topN: number
): Promise<ChunkRow[]> {
  if (chunks.length === 0) return chunks;

  try {
    const { tokenizer, model } = await getReranker();

    const queries = chunks.map(() => query);
    const documents = chunks.map((c) => c.content);

    const inputs = await tokenizer(queries, {
      text_pair: documents,
      padding: true,
      truncation: true,
    });

    const { logits } = await model(inputs);
    const raw = Array.from(logits.data as Float32Array);
    const numLabels = logits.dims[1] ?? 1;

    const scores = chunks.map((_, i) => {
      if (numLabels === 1) {
        return sigmoid(raw[i]);
      }
      // 2-label model: softmax score of the positive class
      const offset = i * numLabels;
      const expPos = Math.exp(raw[offset + 1]);
      const expNeg = Math.exp(raw[offset]);
      return expPos / (expPos + expNeg);
    });

    return chunks
      .map((chunk, i) => ({ chunk, score: scores[i] }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .map((s) => s.chunk);
  } catch (err) {
    console.warn("[cross-encoder] rerank failed, falling back to bi-encoder order:", err);
    return chunks.slice(0, topN);
  }
}
