import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getEmbeddingsBatch } from "../embeddings/bge";
import { CHUNK_SIZE, CHUNK_OVERLAP, SEMANTIC_THRESHOLD } from "../config";

const fallbackSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
});

function sentenceSplit(text: string): string[] {
  // Split on Chinese/English sentence-ending punctuation and blank lines.
  // Keeps the delimiter attached to the preceding sentence.
  return text
    .split(/(?<=[。！？!?])\s*|\n{2,}/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export async function splitTextSemantic(text: string): Promise<string[]> {
  const sentences = sentenceSplit(text);

  // Fall back to fixed chunking for very short texts
  if (sentences.length < 3) {
    return fallbackSplitter.splitText(text);
  }

  // Embed all sentences in a single ONNX batch call (much faster than sequential)
  const embeddings = await getEmbeddingsBatch(sentences);

  // Compute similarity between adjacent sentences; mark breakpoints below threshold
  const breakpoints = new Set<number>();
  for (let i = 0; i < embeddings.length - 1; i++) {
    const sim = cosineSimilarity(embeddings[i], embeddings[i + 1]);
    if (sim < SEMANTIC_THRESHOLD) {
      breakpoints.add(i + 1); // break before sentence i+1
    }
  }

  // Group sentences between breakpoints into candidate chunks
  const candidateChunks: string[] = [];
  let current: string[] = [];
  for (let i = 0; i < sentences.length; i++) {
    if (breakpoints.has(i) && current.length > 0) {
      candidateChunks.push(current.join(" "));
      current = [];
    }
    current.push(sentences[i]);
  }
  if (current.length > 0) candidateChunks.push(current.join(" "));

  // Split any candidate chunk that exceeds CHUNK_SIZE with the fixed splitter
  const finalChunks: string[] = [];
  for (const chunk of candidateChunks) {
    if (chunk.length > CHUNK_SIZE) {
      const sub = await fallbackSplitter.splitText(chunk);
      finalChunks.push(...sub);
    } else {
      finalChunks.push(chunk);
    }
  }

  return finalChunks;
}
