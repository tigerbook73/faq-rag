import { NextRequest, NextResponse } from "next/server";
import { notFoundResponse } from "@/lib/server/api";
import { getDocumentForWrite } from "@/lib/server/data/documents";
import { parseAndSplitDocument } from "@/lib/server/ingest/pipeline";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const doc = await getDocumentForWrite(id);
  if (!doc) return notFoundResponse();

  if (doc.isBuiltIn) {
    return NextResponse.json({ error: "Built-in documents cannot be reindexed" }, { status: 403 });
  }

  if (!doc.fileRef) {
    return NextResponse.json({ error: "File not available for reindexing" }, { status: 422 });
  }

  await parseAndSplitDocument(id, doc.fileRef);
  return NextResponse.json({ status: "queued" });
}
