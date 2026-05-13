import { NextResponse } from "next/server";
import { notFoundResponse, withUser } from "@/lib/server/auth/api";
import { getDocumentForWrite, resetDocumentForReindex } from "@/lib/server/data/documents";
import { processDocument } from "@/lib/server/ingest/pipeline";

export const POST = withUser<{ id: string }>(async (actor, _req, { params }) => {
  const { id } = await params;

  const doc = await getDocumentForWrite(actor, id);
  if (!doc) return notFoundResponse();

  if (!doc.fileRef) {
    return NextResponse.json({ error: "File not available for reindexing" }, { status: 422 });
  }

  await resetDocumentForReindex(id);
  await processDocument(id, doc.fileRef);
  return NextResponse.json({ status: "indexed" });
});
