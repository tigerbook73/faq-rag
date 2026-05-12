import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { z } from "zod";
import { authErrorResponse } from "@/lib/auth/api";
import { requireUser } from "@/lib/auth/require-user";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sanitizeFilename } from "@/lib/storage";
import { mimeFromExt } from "@/lib/ingest/parse";
import { config } from "@/lib/config";
import {
  createPendingDocumentForOwner,
  deleteDocumentById,
  findDuplicateDocumentForOwner,
  setDocumentFileRef,
} from "@/lib/data/documents";
import { PrepareUploadInputSchema } from "@/lib/schemas/document";

const ALLOWED_EXTS = new Set([".md", ".txt", ".pdf", ".docx"]);
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "text/markdown",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function POST(req: NextRequest) {
  try {
    const actor = await requireUser();
    const body = PrepareUploadInputSchema.parse(await req.json());

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

    const existing = await findDuplicateDocumentForOwner(actor.id, hash);
    if (existing) {
      return NextResponse.json({ error: "Duplicate file — already indexed" }, { status: 409 });
    }

    const doc = await createPendingDocumentForOwner({
      ownerUserId: actor.id,
      name,
      mime: mimeFromExt(ext),
      contentHash: hash,
      sizeBytes: size,
    });

    // Path format: "embed/{docId}/{sanitizedFilename}" — see src/lib/storage/index.ts → saveUploadedFile
    const storagePath = `embed/${doc.id}/${sanitizeFilename(name)}`;

    const supabase = createSupabaseServiceClient();
    const { data: urlData, error: urlError } = await supabase.storage
      .from("documents")
      .createSignedUploadUrl(storagePath);

    if (urlError || !urlData) {
      await deleteDocumentById(doc.id).catch(() => {});
      return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
    }

    await setDocumentFileRef(doc.id, storagePath);

    return NextResponse.json(
      { docId: doc.id, signedUrl: urlData.signedUrl, token: urlData.token, document: doc },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    return authErrorResponse(error);
  }
}
