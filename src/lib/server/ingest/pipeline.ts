import crypto from "crypto";
import path from "path";
import fs from "fs/promises";
import { prisma } from "../db/client";
import { findDuplicateDocument, setDocumentFailed } from "../data/documents";
import { parseFile, parseBuffer, mimeFromExt } from "./parse";
import { splitText, splitTextMarkdown } from "./split";
import { embedBatchForIndexing, getEmbeddingModelId } from "../embeddings/router";
import { detectLang } from "../lang/detect";
import { saveUploadedFile, readUploadedFile } from "../storage";
import { logger } from "../logger";

async function embedAndStoreChunks(docId: string, chunks: string[]): Promise<void> {
  const embeddings = await embedBatchForIndexing(chunks);
  await prisma.$transaction(
    chunks.map(
      (text, i) =>
        prisma.$executeRaw`
        INSERT INTO chunks (id, document_id, ord, content, lang, embedding, created_at)
        VALUES (
          ${crypto.randomUUID()}::uuid,
          ${docId}::uuid,
          ${i},
          ${text},
          ${detectLang(text)},
          ${`[${embeddings[i].join(",")}]`}::vector,
          NOW()
        )
      `,
    ),
  );
}

// CLI path — local filesystem only
export async function ingestFile(filePath: string): Promise<string> {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = mimeFromExt(ext);
  const buffer = await fs.readFile(filePath);
  const contentHash = crypto.createHash("sha256").update(buffer).digest("hex");
  const sizeBytes = buffer.length;

  const embeddingModel = getEmbeddingModelId();
  const existing = await findDuplicateDocument(contentHash, embeddingModel);
  if (existing) {
    logger.info({ fileName, hash: contentHash.slice(0, 8) }, "ingest: skipping duplicate");
    return existing.id;
  }
  const doc = await prisma.document.create({
    data: { name: fileName, mime, contentHash, sizeBytes, status: "pending", fileRef: filePath, embeddingModel },
  });

  try {
    const text = await parseFile(filePath);
    const lang = detectLang(text);
    const chunks = await (ext === ".md" ? splitTextMarkdown(text) : splitText(text));

    await prisma.document.update({
      where: { id: doc.id },
      data: { totalChunks: chunks.length },
    });
    await embedAndStoreChunks(doc.id, chunks);
    await prisma.document.update({
      where: { id: doc.id },
      data: { status: "indexed", lang },
    });

    logger.info({ fileName, chunks: chunks.length, lang }, "ingest: indexed");
    return doc.id;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await prisma.document.update({
      where: { id: doc.id },
      data: { status: "failed", errorMsg },
    });
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

  const embeddingModel = getEmbeddingModelId();
  const existing = await findDuplicateDocument(contentHash, embeddingModel);
  if (existing) return { docId: existing.id, filePath: null };

  const doc = await prisma.document.create({
    data: { name: fileName, mime, contentHash, sizeBytes, status: "pending", embeddingModel },
  });

  const storagePath = await saveUploadedFile(buffer, doc.id, fileName);
  await prisma.document.update({
    where: { id: doc.id },
    data: { fileRef: storagePath },
  });

  return { docId: doc.id, filePath: storagePath };
}

async function storeChunksWithoutEmbeddings(docId: string, chunks: string[]): Promise<void> {
  await prisma.$transaction(
    chunks.map(
      (text, i) =>
        prisma.$executeRaw`
        INSERT INTO chunks (id, document_id, ord, content, lang, created_at)
        VALUES (
          ${crypto.randomUUID()}::uuid,
          ${docId}::uuid,
          ${i},
          ${text},
          ${detectLang(text)},
          NOW()
        )
      `,
    ),
  );
}

/** Parse + split file into chunks stored without embeddings; sets status=indexing. */
export async function parseAndSplitDocument(docId: string, filePath: string): Promise<void> {
  await prisma.document.update({ where: { id: docId }, data: { status: "indexing", errorMsg: null } });
  try {
    const buffer = await readUploadedFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const text = await parseBuffer(buffer, ext);
    const lang = detectLang(text);

    const splitter = ext === ".md" ? splitTextMarkdown : splitText;
    const [chunks] = await Promise.all([splitter(text), prisma.chunk.deleteMany({ where: { documentId: docId } })]);

    await storeChunksWithoutEmbeddings(docId, chunks);
    await prisma.document.update({
      where: { id: docId },
      data: { totalChunks: chunks.length, lang },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await setDocumentFailed(docId, errorMsg);
    throw err;
  }
}

// Indexing — called by worker (local) or inline (cloud)
export async function processDocument(docId: string, filePath: string): Promise<void> {
  await prisma.document.update({ where: { id: docId }, data: { status: "indexing" } });
  try {
    const buffer = await readUploadedFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const text = await parseBuffer(buffer, ext);
    const lang = detectLang(text);

    const splitter = ext === ".md" ? splitTextMarkdown : splitText;
    const [chunks] = await Promise.all([splitter(text), prisma.chunk.deleteMany({ where: { documentId: docId } })]);

    await Promise.all([
      prisma.document.update({ where: { id: docId }, data: { totalChunks: chunks.length } }),
      embedAndStoreChunks(docId, chunks),
    ]);

    const embeddingModel = getEmbeddingModelId();
    await prisma.document.update({
      where: { id: docId },
      data: { status: "indexed", lang, errorMsg: null, embeddingModel },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await prisma.document.update({ where: { id: docId }, data: { status: "failed", errorMsg } }).catch(() => {
      logger.info({ docId }, "ingest: indexing aborted — document was deleted mid-indexing");
    });
    throw err;
  }
}
