import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { checkRateLimit } from "@/lib/rate-limit";
import { enqueueIndexing } from "@/lib/ingest/indexing-queue";
import { processDocument } from "@/lib/ingest/pipeline";
import { IS_CLOUD } from "@/lib/config";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { allowed, retryAfterMs } = checkRateLimit(`reindex:${id}`, 1, 60 * 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Already reindexed recently, please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!doc.filePath) {
    return NextResponse.json({ error: "File path not available for reindexing" }, { status: 422 });
  }

  await prisma.document.update({ where: { id }, data: { status: "pending", errorMsg: null } });

  if (IS_CLOUD) {
    await processDocument(id, doc.filePath);
    return NextResponse.json({ status: "indexed" });
  }

  enqueueIndexing(id, doc.filePath);
  return NextResponse.json({ status: "reindexing" });
}
