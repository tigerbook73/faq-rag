import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sanitizeFilename } from "@/lib/storage";
import { mimeFromExt } from "@/lib/ingest/parse";
import { config } from "@/lib/config";

const ALLOWED_EXTS = new Set([".md", ".txt", ".pdf", ".docx"]);
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "text/markdown",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const bodySchema = z.object({
  name: z.string().min(1),
  size: z.number().int().positive(),
  mime: z.string(),
  hash: z.string().length(64),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, size, mime, hash } = body;

  const ext = path.extname(name).toLowerCase();
  if (!ALLOWED_EXTS.has(ext)) {
    return NextResponse.json({ error: `Unsupported file type: ${ext}` }, { status: 400 });
  }

  if (mime && mime !== "application/octet-stream" && !ALLOWED_MIME_TYPES.has(mime)) {
    return NextResponse.json({ error: `Unsupported MIME type: ${mime}` }, { status: 400 });
  }

  if (size > config.embedding.maxBytesCloud) {
    return NextResponse.json({ error: "File exceeds 50 KB limit" }, { status: 413 });
  }

  const existing = await prisma.document.findUnique({ where: { contentHash: hash } });
  if (existing) {
    return NextResponse.json({ error: "Duplicate file — already indexed" }, { status: 409 });
  }

  const doc = await prisma.document.create({
    data: {
      name,
      mime: mimeFromExt(ext),
      contentHash: hash,
      sizeBytes: size,
      status: "pending",
    },
  });

  // Path format: "embed/{docId}/{sanitizedFilename}" — see src/lib/storage/index.ts → saveUploadedFile
  const storagePath = `embed/${doc.id}/${sanitizeFilename(name)}`;

  const supabase = createSupabaseServiceClient();
  const { data: urlData, error: urlError } = await supabase.storage
    .from("documents")
    .createSignedUploadUrl(storagePath);

  if (urlError || !urlData) {
    await prisma.document.delete({ where: { id: doc.id } }).catch(() => {});
    return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
  }

  await prisma.document.update({
    where: { id: doc.id },
    data: { filePath: storagePath },
  });

  return NextResponse.json({ docId: doc.id, signedUrl: urlData.signedUrl, token: urlData.token }, { status: 201 });
}
