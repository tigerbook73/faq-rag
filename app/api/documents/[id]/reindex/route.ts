import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { prisma } from "@/src/lib/db/client";
import { processDocument } from "@/src/lib/ingest/pipeline";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./data/uploads";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(UPLOAD_DIR, id, doc.name);

  await prisma.document.update({
    where: { id },
    data: { status: "pending", errorMsg: null },
  });

  void processDocument(id, filePath).catch(console.error);

  return NextResponse.json({ status: "reindexing" });
}
