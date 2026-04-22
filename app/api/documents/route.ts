import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/db/client";
import { ingestBuffer } from "@/src/lib/ingest/pipeline";

const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const { page, pageSize } = listSchema.parse(params);
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.document.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { chunks: true } } },
    }),
    prisma.document.count(),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const allowedExts = [".md", ".txt", ".pdf", ".docx"];
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (!allowedExts.includes(ext)) {
    return NextResponse.json({ error: `Unsupported file type: ${ext}` }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const docId = await ingestBuffer(file.name, buffer);

  return NextResponse.json({ id: docId }, { status: 201 });
}
