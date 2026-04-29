import crypto from "crypto";
import path from "path";
import fs from "fs/promises";
import { prisma } from "../db/client";
import { parseFile, parseBuffer, mimeFromExt } from "./parse";
import { splitText } from "./split";
import { getEmbedding } from "../embeddings/router";
import { detectLang } from "../lang/detect";
import { saveUploadedFile, readUploadedFile } from "../storage";
import { logger } from "../logger";

async function embedAndStoreChunks(docId: string, chunks: string[]): Promise<void> {
  for (let i = 0; i < chunks.length; i++) {
    await new Promise((r) => setImmediate(r));
    const chunkText = chunks[i];
    const chunkLang = detectLang(chunkText);
    const embedding = await getEmbedding(chunkText);
    const vec = `[${embedding.join(",")}]`;
    const chunkId = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO chunks (id, document_id, ord, content, lang, embedding, created_at)
      VALUES (
        ${chunkId}::uuid,
        ${docId}::uuid,
        ${i},
        ${chunkText},
        ${chunkLang},
        ${vec}::vector,
        NOW()
      )
    `;
  }
}

// CLI path — local filesystem only
export async function ingestFile(filePath: string): Promise<string> {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = mimeFromExt(ext);
  const buffer = await fs.readFile(filePath);
  const contentHash = crypto.createHash("sha256").update(buffer).digest("hex");
  const sizeBytes = buffer.length;

  const existing = await prisma.document.findUnique({ where: { contentHash } });
  if (existing) {
    logger.info({ fileName, hash: contentHash.slice(0, 8) }, "ingest: skipping duplicate");
    return existing.id;
  }

  const doc = await prisma.document.create({
    data: { name: fileName, mime, contentHash, sizeBytes, status: "pending", filePath },
  });

  try {
    const text = await parseFile(filePath);
    const lang = detectLang(text);
    const chunks = await splitText(text);

    await prisma.document.update({ where: { id: doc.id }, data: { totalChunks: chunks.length } });
    await embedAndStoreChunks(doc.id, chunks);
    await prisma.document.update({ where: { id: doc.id }, data: { status: "indexed", lang } });

    logger.info({ fileName, chunks: chunks.length, lang }, "ingest: indexed");
    return doc.id;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await prisma.document.update({ where: { id: doc.id }, data: { status: "failed", errorMsg } });
    throw err;
  }
}

// API upload path — writes file to storage, returns docId and storage path
export async function ingestBuffer(
  fileName: string,
  buffer: Buffer,
): Promise<{ docId: string; filePath: string } | { docId: string; filePath: null }> {
  const ext = path.extname(fileName).toLowerCase();
  const mime = mimeFromExt(ext);
  const contentHash = crypto.createHash("sha256").update(buffer).digest("hex");
  const sizeBytes = buffer.length;

  const existing = await prisma.document.findUnique({ where: { contentHash } });
  if (existing) return { docId: existing.id, filePath: null };

  const doc = await prisma.document.create({
    data: { name: fileName, mime, contentHash, sizeBytes, status: "pending" },
  });

  const storagePath = await saveUploadedFile(buffer, doc.id, fileName);
  await prisma.document.update({ where: { id: doc.id }, data: { filePath: storagePath } });

  return { docId: doc.id, filePath: storagePath };
}

// Indexing — called by worker (local) or inline (cloud)
export async function processDocument(docId: string, filePath: string): Promise<void> {
  try {
    const buffer = await readUploadedFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const text = await parseBuffer(buffer, ext);

    const lang = detectLang(text);
    const chunks = await splitText(text);

    await prisma.chunk.deleteMany({ where: { documentId: docId } });
    await prisma.document.update({ where: { id: docId }, data: { totalChunks: chunks.length } });
    await embedAndStoreChunks(docId, chunks);
    await prisma.document.update({ where: { id: docId }, data: { status: "indexed", lang, errorMsg: null } });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await prisma.document
      .update({ where: { id: docId }, data: { status: "failed", errorMsg } })
      .catch(() => {
        logger.info({ docId }, "ingest: indexing aborted — document was deleted mid-indexing");
      });
    throw err;
  }
}
