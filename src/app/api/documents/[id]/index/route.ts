import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, notFoundResponse } from "@/lib/server/auth/api";
import { requireUser } from "@/lib/server/auth/require-user";
import { config } from "@/lib/shared/config";
import { getDocumentForWrite, setDocumentUploaded } from "@/lib/server/data/documents";
import { enqueueIndexing } from "@/lib/server/ingest/indexing-queue";
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
      return NextResponse.json({ error: "File not yet uploaded" }, { status: 422 });
    }

    // Idempotent: only one of A-path or B-path (webhook) wins this update
    const result = await setDocumentUploaded(id);

    if (result.count === 0) {
      return NextResponse.json({ status: "already_processing" });
    }

    if (config.embedding.useOpenAI) {
      await processDocument(id, doc.fileRef);
    } else {
      enqueueIndexing(id, doc.fileRef);
    }

    return NextResponse.json({ status: "queued" });
  } catch (error) {
    return authErrorResponse(error);
  }
}
