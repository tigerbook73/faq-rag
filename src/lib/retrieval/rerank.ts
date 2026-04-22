import type { ChunkRow } from './vector-search';

export function deduplicateAndSort(chunks: ChunkRow[]): ChunkRow[] {
  const seen = new Set<string>();
  const unique: ChunkRow[] = [];
  for (const chunk of chunks) {
    if (!seen.has(chunk.id)) {
      seen.add(chunk.id);
      unique.push(chunk);
    }
  }
  return unique.sort((a, b) => b.score - a.score);
}
