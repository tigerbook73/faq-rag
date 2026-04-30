import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { IS_CLOUD } from "@/lib/config";
import { enqueueIndexing } from "@/lib/ingest/indexing-queue";
import { processDocument } from "@/lib/ingest/pipeline";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!doc.filePath) {
    return NextResponse.json({ error: "File not yet uploaded" }, { status: 422 });
  }

  // Idempotent: only one of A-path or B-path (webhook) wins this update
  const result = await prisma.document.updateMany({
    where: { id, status: "pending" },
    data: { status: "uploaded" },
  });

  if (result.count === 0) {
    return NextResponse.json({ status: "already_processing" });
  }

  if (IS_CLOUD) {
    await processDocument(id, doc.filePath);
  } else {
    enqueueIndexing(id, doc.filePath);
  }

  return NextResponse.json({ status: "queued" });
}
