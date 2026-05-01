import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { config } from "@/lib/config";
import { enqueueIndexing } from "@/lib/ingest/indexing-queue";
import { processDocument } from "@/lib/ingest/pipeline";
import { logger } from "@/lib/logger";

// Payload sent by the storage_notify_indexing trigger
// (prisma/migrations/20260430120000_ingest_hook_trigger/migration.sql):
//   body = jsonb_build_object('docId', split_part(NEW.name, '/', 1))
// where NEW.name is the storage object path "{docId}/{sanitizedFilename}"
// defined in src/lib/storage/index.ts → saveUploadedFile.
const bodySchema = z.object({ docId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.INGEST_HOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { docId } = body;

  logger.info({ docId }, "[ingest-hook] webhook received");

  const doc = await prisma.document.findUnique({ where: { id: docId } });
  if (!doc?.filePath) {
    logger.warn({ docId }, "[ingest-hook] document not found or missing filePath");
    return NextResponse.json({ error: "Document not found or missing filePath" }, { status: 404 });
  }

  // Idempotent: only one of A-path or B-path wins this update
  const result = await prisma.document.updateMany({
    where: { id: docId, status: "pending" },
    data: { status: "uploaded" },
  });

  if (result.count === 0) {
    logger.info({ docId }, "[ingest-hook] already processing, skipping");
    return NextResponse.json({ status: "already_processing" });
  }

  if (config.embedding.useOpenAI) {
    // Fire and forget — pg_net does not need to wait for indexing to complete
    processDocument(docId, doc.filePath).catch(async (err) => {
      logger.error({ docId, err }, "[ingest-hook] processDocument failed");
      await prisma.document
        .update({ where: { id: docId }, data: { status: "failed", errorMsg: String(err) } })
        .catch(() => {});
    });
  } else {
    enqueueIndexing(docId, doc.filePath);
  }

  logger.info({ docId }, "[ingest-hook] queued for indexing");
  return NextResponse.json({ status: "queued" });
}
