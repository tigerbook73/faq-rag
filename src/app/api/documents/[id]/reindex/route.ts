import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, notFoundResponse } from "@/lib/server/auth/api";
import { requireUser } from "@/lib/server/auth/require-user";
import { getDocumentForWrite, resetDocumentForReindex } from "@/lib/server/data/documents";
import { processDocument } from "@/lib/server/ingest/pipeline";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireUser();
    const { id } = await params;

    const doc = await getDocumentForWrite(actor, id);
    if (!doc) {
      return notFoundResponse();
    }

    if (!doc.fileRef) {
      return NextResponse.json({ error: "File not available for reindexing" }, { status: 422 });
    }

    await resetDocumentForReindex(id);

    await processDocument(id, doc.fileRef);
    return NextResponse.json({ status: "indexed" });
  } catch (error) {
    return authErrorResponse(error);
  }
}
