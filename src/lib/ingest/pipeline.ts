import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { prisma } from "../db/client";
import { parseFile, mimeFromExt } from "./parse";
import { splitText } from "./split";
import { getEmbedding } from "../embeddings/bge";
import { detectLang } from "../lang/detect";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./data/uploads";

export async function ingestFile(filePath: string): Promise<string> {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = mimeFromExt(ext);
  const buffer = await fs.readFile(filePath);
  const contentHash = crypto.createHash("sha256").update(buffer).digest("hex");
  const sizeBytes = buffer.length;

  const existing = await prisma.document.findUnique({ where: { contentHash } });
  if (existing) {
    console.log(`[ingest] Skipping duplicate: ${fileName} (hash=${contentHash.slice(0, 8)})`);
    return existing.id;
  }

  const doc = await prisma.document.create({
    data: {
      name: fileName,
      mime,
      contentHash,
      sizeBytes,
      status: "pending",
    },
  });

  try {
    const text = await parseFile(filePath);
    const lang = detectLang(text);
    const chunks = await splitText(text);

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const chunkLang = detectLang(chunkText);
      const embedding = await getEmbedding(chunkText);
      const vec = `[${embedding.join(",")}]`;
      const chunkId = crypto.randomUUID();

      await prisma.$executeRaw`
        INSERT INTO chunks (id, document_id, ord, content, lang, embedding, created_at)
        VALUES (
          ${chunkId}::uuid,
          ${doc.id}::uuid,
          ${i},
          ${chunkText},
          ${chunkLang},
          ${vec}::vector,
          NOW()
        )
      `;
    }

    await prisma.document.update({
      where: { id: doc.id },
      data: { status: "indexed", lang },
    });

    console.log(`[ingest] Indexed "${fileName}": ${chunks.length} chunks, lang=${lang}`);
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

export async function ingestBuffer(fileName: string, buffer: Buffer): Promise<string> {
  const ext = path.extname(fileName).toLowerCase();
  const mime = mimeFromExt(ext);
  const contentHash = crypto.createHash("sha256").update(buffer).digest("hex");
  const sizeBytes = buffer.length;

  const existing = await prisma.document.findUnique({ where: { contentHash } });
  if (existing) return existing.id;

  const doc = await prisma.document.create({
    data: { name: fileName, mime, contentHash, sizeBytes, status: "pending" },
  });

  const uploadPath = path.join(UPLOAD_DIR, doc.id, fileName);
  await fs.mkdir(path.dirname(uploadPath), { recursive: true });
  await fs.writeFile(uploadPath, buffer);

  // kick off async indexing — don't await so the HTTP response returns immediately
  void processDocument(doc.id, uploadPath).catch((err) => {
    console.error(`[ingest] Error processing ${fileName}:`, err);
  });

  return doc.id;
}

export async function processDocument(docId: string, filePath: string): Promise<void> {
  try {
    const text = await parseFile(filePath);
    const lang = detectLang(text);
    const chunks = await splitText(text);

    // remove old chunks if re-indexing
    await prisma.chunk.deleteMany({ where: { documentId: docId } });

    for (let i = 0; i < chunks.length; i++) {
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

    await prisma.document.update({
      where: { id: docId },
      data: { status: "indexed", lang, errorMsg: null },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await prisma.document.update({
      where: { id: docId },
      data: { status: "failed", errorMsg },
    });
    throw err;
  }
}
