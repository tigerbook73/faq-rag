import { NextRequest, NextResponse } from "next/server";
import { notFoundResponse } from "@/lib/server/api";
import { getDocumentForWrite, setDocumentUploaded } from "@/lib/server/data/documents";
import { parseAndSplitDocument } from "@/lib/server/ingest/pipeline";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const doc = await getDocumentForWrite(id);
  if (!doc) return notFoundResponse();

  if (!doc.fileRef) {
    return NextResponse.json({ error: "File not yet uploaded" }, { status: 422 });
  }

  const result = await setDocumentUploaded(id);

  if (result.count === 0) {
    return NextResponse.json({ status: "already_processing" });
  }

  await parseAndSplitDocument(id, doc.fileRef);

  return NextResponse.json({ status: "queued" });
}
