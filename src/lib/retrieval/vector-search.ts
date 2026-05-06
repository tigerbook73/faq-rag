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

export async function vectorSearch(embedding: number[], topK: number, userId: string): Promise<ChunkRow[]> {
  const vec = `[${embedding.join(",")}]`;
  return prisma.$queryRaw<ChunkRow[]>`
    SELECT
      c.id,
      c.document_id,
      c.ord,
      c.content,
      c.lang,
      1 - (c.embedding <=> ${vec}::vector) AS score,
      d.name AS document_name
    FROM chunks c
    JOIN documents d ON d.id = c.document_id
    WHERE d.status = 'indexed'
      AND (
        d.owner_user_id = ${userId}
        OR (
          d.visibility = 'public'
          AND EXISTS (
            SELECT 1
            FROM public_document_selections s
            WHERE s.document_id = d.id
              AND s.user_id = ${userId}
          )
        )
      )
    ORDER BY c.embedding <=> ${vec}::vector
    LIMIT ${topK}
  `;
}
