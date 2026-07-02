import { prisma } from "../db/client";

export interface ChunkRow {
  id: string;
  document_id: string;
  ord: number;
  content: string;
  lang: string;
  score: number;
  document_name: string;
}

export async function vectorSearch(embedding: number[], topK: number, embeddingModel: string): Promise<ChunkRow[]> {
  const vec = `[${embedding.join(",")}]`;
  // For bge-m3 (local), also match NULL rows (legacy docs indexed before this field was added)
  const modelFilter =
    embeddingModel === "bge-m3" ? `(d.embedding_model = $3 OR d.embedding_model IS NULL)` : `d.embedding_model = $3`;

  return prisma.$queryRawUnsafe<ChunkRow[]>(
    `SELECT
      c.id,
      c.document_id,
      c.ord,
      c.content,
      c.lang,
      1 - (c.embedding <=> $1::vector) AS score,
      d.name AS document_name
    FROM chunks c
    JOIN documents d ON d.id = c.document_id
    WHERE d.status = 'indexed'
      AND ${modelFilter}
    ORDER BY c.embedding <=> $1::vector
    LIMIT $2`,
    vec,
    topK,
    embeddingModel,
  );
}
