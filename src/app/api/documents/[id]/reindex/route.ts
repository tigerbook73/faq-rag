import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { processDocument } from "@/lib/ingest/pipeline";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!doc.fileRef) {
    return NextResponse.json({ error: "File not available for reindexing" }, { status: 422 });
  }

  await prisma.document.update({
    where: { id },
    data: { status: "pending", errorMsg: null },
  });

  await processDocument(id, doc.fileRef);
  return NextResponse.json({ status: "indexed" });
}
