import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { prisma } from "@/src/lib/db/client";
import { checkRateLimit } from "@/src/lib/rate-limit";
import { enqueueIndexing } from "@/src/lib/ingest/indexing-queue";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./data/uploads";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { allowed, retryAfterMs } = checkRateLimit(`reindex:${id}`, 1, 60 * 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Already reindexed recently, please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(UPLOAD_DIR, id, doc.name);

  await prisma.document.update({
    where: { id },
    data: { status: "pending", errorMsg: null },
  });

  enqueueIndexing(id, filePath);

  return NextResponse.json({ status: "reindexing" });
}
