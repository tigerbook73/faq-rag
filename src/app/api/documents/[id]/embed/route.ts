import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { notFoundResponse, validationErrorResponse } from "@/lib/server/api";
import {
  getDocumentForWrite,
  findUnembeddedChunks,
  countUnembeddedChunks,
  updateChunkEmbeddings,
  setDocumentIndexed,
} from "@/lib/server/data/documents";
import { getEmbeddingsBatch } from "@/lib/server/embeddings/router";

const BodySchema = z.object({
  batchSize: z.number().int().min(1).max(100).default(20),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const { batchSize } = parsed.data;

  const doc = await getDocumentForWrite(id);
  if (!doc) return notFoundResponse();

  if (doc.status !== "indexing") {
    return NextResponse.json({ embedded: 0, remaining: 0, status: doc.status });
  }

  const chunks = await findUnembeddedChunks(id, batchSize);

  if (chunks.length === 0) {
    await setDocumentIndexed(id);
    return NextResponse.json({ embedded: 0, remaining: 0, status: "indexed" });
  }

  const embeddings = await getEmbeddingsBatch(chunks.map((c) => c.content));
  await updateChunkEmbeddings(chunks.map((c, i) => ({ id: c.id, embedding: embeddings[i] })));

  const remaining = await countUnembeddedChunks(id);

  if (remaining === 0) {
    await setDocumentIndexed(id);
    return NextResponse.json({ embedded: chunks.length, remaining: 0, status: "indexed" });
  }

  return NextResponse.json({ embedded: chunks.length, remaining, status: "indexing" });
}
