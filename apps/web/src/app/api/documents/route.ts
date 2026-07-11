import { NextRequest, NextResponse } from "next/server";
import { validationErrorResponse } from "@/lib/server/api";
import { listDocumentsPage } from "@/lib/server/data/documents";
import { getEmbeddingModelId } from "@/lib/server/embeddings/router";
import { DocumentListQuerySchema } from "@faq-rag/shared";

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = DocumentListQuerySchema.safeParse(params);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }
  const { page, pageSize, allModels } = parsed.data;
  const skip = (page - 1) * pageSize;
  const { items, total } = await listDocumentsPage({
    skip,
    take: pageSize,
    embeddingModel: allModels ? undefined : getEmbeddingModelId(),
  });
  return NextResponse.json({ items, total, page, pageSize });
}
