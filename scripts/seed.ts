/**
 * Seed script for pre-computing embeddings and importing them into the DB.
 *
 * Usage:
 *   pnpm seed:export <input-file> [--model <openai|local>] [--out-dir <dir>]
 *   pnpm seed:import <seed-file>  [--db-url <url>]
 *
 * Output filename: <basename>-(openai|local).jsonl
 *
 * File format (JSONL — one JSON object per line):
 *   Line 1: {"type":"meta", "version":1, "source":"...", "model":"local"|"openai",
 *             "modelName":"bge-m3"|"text-embedding-3-small", "encoding":"float32-base64",
 *             "dimensions":1024, "generatedAt":"<ISO>"}
 *   Line N: {"type":"chunk", "ord":N, "content":"...", "lang":"...", "embedding":"<base64>"}
 *
 * Env loading order (later files override earlier, handled automatically by bun):
 *   development (default): .env → .env.development.local
 *   production (NODE_ENV=production): .env → .env.production
 */

import path from "path";
import fs from "fs/promises";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import crypto from "crypto";

// ── CLI argument parsing ──────────────────────────────────────────────────────

const args = process.argv.slice(2);
const mode = args[0];
const positional = args.filter((a) => !a.startsWith("--"));
const getFlag = (name: string) => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
};

if (mode !== "export" && mode !== "import" && mode !== "clear") {
  console.error("Usage:");
  console.error("  pnpm seed:export <input-file> [--model <openai|local>] [--out-dir <dir>]");
  console.error("  pnpm seed:import <seed-file>");
  console.error("  pnpm seed:clear [source-name]  # omit name to clear all built-in");
  process.exit(1);
}

// ── Constants ─────────────────────────────────────────────────────────────────

const OPENAI_MODEL_NAME = "text-embedding-3-small";
const LOCAL_MODEL_NAME = "bge-m3";

// ── Types ─────────────────────────────────────────────────────────────────────

type SeedModelType = "openai" | "local";

interface SeedMeta {
  type: "meta";
  version: 1;
  source: string;
  model: SeedModelType;
  modelName: string;
  encoding: "float32-base64";
  dimensions: 1024;
  generatedAt: string;
}

interface SeedChunk {
  type: "chunk";
  ord: number;
  content: string;
  lang: string;
  /** Base64-encoded little-endian Float32Array (1024 × 4 bytes) */
  embedding: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

/** Encodes float64[] → Float32 little-endian → base64 string. */
function encodeEmbedding(floats: number[]): string {
  const buf = Buffer.allocUnsafe(floats.length * 4);
  for (let i = 0; i < floats.length; i++) buf.writeFloatLE(floats[i], i * 4);
  return buf.toString("base64");
}

/** Decodes base64 string → Float32 little-endian → number[]. */
function decodeEmbedding(b64: string): number[] {
  const buf = Buffer.from(b64, "base64");
  const result = new Array<number>(buf.length / 4);
  for (let i = 0; i < result.length; i++) result[i] = buf.readFloatLE(i * 4);
  return result;
}

/** Reads a JSONL seed file line by line, yielding parsed objects. */
async function* readJsonlLines(filePath: string): AsyncGenerator<unknown> {
  const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed) yield JSON.parse(trimmed);
  }
}

// ── Export mode ───────────────────────────────────────────────────────────────

async function runExport() {
  const inputPath = positional[1];
  if (!inputPath) {
    console.error("Usage: pnpm seed:export <input-file> [--model <openai|local>] [--out-dir <dir>]");
    process.exit(1);
  }

  const resolvedInput = path.resolve(inputPath);

  // Determine model type
  const modelFlag = getFlag("model") as SeedModelType | undefined;
  const useOpenAI = process.env.EMBEDDING_PROVIDER === "openai";
  const modelType: SeedModelType = modelFlag ?? (useOpenAI ? "openai" : "local");
  const modelName = modelType === "openai" ? OPENAI_MODEL_NAME : LOCAL_MODEL_NAME;

  const outDir = getFlag("out-dir") ? path.resolve(getFlag("out-dir")!) : path.dirname(resolvedInput);
  const baseName = path.basename(resolvedInput, path.extname(resolvedInput));
  const outPath = path.join(outDir, `${baseName}-${modelType}.jsonl`);

  const { parseFile } = await import("../src/lib/server/ingest/parse");
  const { splitTextMarkdown } = await import("../src/lib/server/ingest/split");
  const { detectLang } = await import("../src/lib/server/lang/detect");

  console.log(`Parsing: ${path.basename(resolvedInput)}`);
  const text = await parseFile(resolvedInput);

  console.log("Splitting into chunks…");
  const chunks = await splitTextMarkdown(text);
  console.log(`  ${chunks.length} chunks`);

  let embedFn: (texts: string[]) => Promise<number[][]>;
  if (modelType === "openai") {
    const { getEmbeddingsBatchOpenAI } = await import("../src/lib/server/embeddings/openai-embed");
    embedFn = getEmbeddingsBatchOpenAI;
  } else {
    const { getEmbeddingsBatch } = await import("../src/lib/server/embeddings/bge");
    embedFn = getEmbeddingsBatch;
  }

  console.log(`Embedding chunks with ${modelName} (batches of 100)…`);
  const batches = chunkArray(chunks, 100);

  const meta: SeedMeta = {
    type: "meta",
    version: 1,
    source: path.basename(resolvedInput),
    model: modelType,
    modelName,
    encoding: "float32-base64",
    dimensions: 1024,
    generatedAt: new Date().toISOString(),
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(meta) + "\n", "utf-8");

  let ord = 0;
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    process.stdout.write(`  Batch ${i + 1}/${batches.length} (${batch.length} chunks)… `);
    const embeddings = await embedFn(batch);
    const lines = batch
      .map(
        (content, j): SeedChunk => ({
          type: "chunk",
          ord: ord + j,
          content,
          lang: detectLang(content),
          embedding: encodeEmbedding(embeddings[j]),
        }),
      )
      .map((c) => JSON.stringify(c))
      .join("\n");
    await fs.appendFile(outPath, lines + "\n", "utf-8");
    ord += batch.length;
    console.log("done");
    await new Promise((r) => setImmediate(r));
  }

  const stat = await fs.stat(outPath);
  console.log(`\nSeed file written: ${outPath}`);
  console.log(`  ${chunks.length} chunks, ${stat.size} bytes, model: ${modelName}`);
}

// ── Import mode ───────────────────────────────────────────────────────────────

async function runImport() {
  const seedPath = positional[1];
  if (!seedPath) {
    console.error("Usage: pnpm seed:import <seed-file> [--db-url <url>]");
    process.exit(1);
  }

  const resolvedSeed = path.resolve(seedPath);

  // Read first line as meta
  let meta: SeedMeta | null = null;
  const lines = readJsonlLines(resolvedSeed);
  const firstLine = await lines.next();
  if (firstLine.done) {
    console.error("Empty seed file.");
    process.exit(1);
  }
  const firstObj = firstLine.value as Record<string, unknown>;
  if (firstObj.type !== "meta" || firstObj.version !== 1 || firstObj.encoding !== "float32-base64") {
    console.error("Unsupported seed file format.");
    process.exit(1);
  }
  if (firstObj.model !== "openai" && firstObj.model !== "local") {
    console.error(`Unknown model type: ${firstObj.model}. Expected "openai" or "local".`);
    process.exit(1);
  }
  meta = firstObj as unknown as SeedMeta;

  const embeddingModel = meta.model === "openai" ? "openai" : "bge-m3";
  // contentHash is deterministic by source + modelName (excludes generatedAt so re-exports are idempotent)
  const contentHash = crypto
    .createHash("sha256")
    .update(meta.source + meta.modelName)
    .digest("hex");

  console.log(`Importing: ${meta.source} (model: ${meta.modelName})`);
  if (dbUrl) console.log(`  DB: ${dbUrl.replace(/:[^:@]+@/, ":***@")}`);

  // Dynamic import AFTER env override
  const { PrismaClient } = await import("../src/generated/prisma");
  const prisma = new PrismaClient();

  // Dedup check using compound key
  const existing = await prisma.document.findUnique({
    where: { contentHash_embeddingModel: { contentHash, embeddingModel } },
  });
  if (existing) {
    console.log(`  Already imported (id=${existing.id}). Skipping.`);
    await prisma.$disconnect();
    process.exit(0);
  }

  // Count chunks by scanning through file (second pass needed for totalChunks)
  let chunkCount = 0;
  for await (const obj of readJsonlLines(resolvedSeed)) {
    if ((obj as Record<string, unknown>).type === "chunk") chunkCount++;
  }

  const doc = await prisma.document.create({
    data: {
      name: meta.source,
      mime: "text/markdown",
      contentHash,
      lang: "en",
      sizeBytes: (await fs.stat(resolvedSeed)).size,
      status: "indexing",
      embeddingModel,
      isBuiltIn: true,
      totalChunks: chunkCount,
    },
  });

  console.log(`  Created document id=${doc.id}`);

  // Stream chunks in batches of 50
  const BATCH_SIZE = 50;
  let batch: SeedChunk[] = [];
  let inserted = 0;

  async function flushBatch(b: SeedChunk[]) {
    await prisma.$transaction(
      b.map(
        (chunk) =>
          prisma.$executeRaw`
          INSERT INTO chunks (id, document_id, ord, content, lang, embedding, created_at)
          VALUES (
            ${crypto.randomUUID()}::uuid,
            ${doc.id}::uuid,
            ${chunk.ord},
            ${chunk.content},
            ${chunk.lang},
            ${`[${decodeEmbedding(chunk.embedding).join(",")}]`}::vector,
            NOW()
          )
        `,
      ),
    );
    inserted += b.length;
    console.log(`  Inserted ${inserted}/${chunkCount} chunks`);
  }

  for await (const obj of readJsonlLines(resolvedSeed)) {
    const row = obj as Record<string, unknown>;
    if (row.type !== "chunk") continue;
    batch.push(row as unknown as SeedChunk);
    if (batch.length >= BATCH_SIZE) {
      await flushBatch(batch);
      batch = [];
    }
  }
  if (batch.length > 0) await flushBatch(batch);

  await prisma.document.update({
    where: { id: doc.id },
    data: { status: "indexed" },
  });

  console.log(`\nImport complete. Document id=${doc.id}`);
  await prisma.$disconnect();
}

// ── Clear mode ────────────────────────────────────────────────────────────────

async function runClear() {
  const sourceName = positional[1]; // optional: filter by document name

  const { PrismaClient } = await import("../src/generated/prisma");
  const prisma = new PrismaClient();

  const where = sourceName ? { isBuiltIn: true, name: sourceName } : { isBuiltIn: true };
  const docs = await prisma.document.findMany({ where, select: { id: true, name: true, embeddingModel: true } });

  if (docs.length === 0) {
    console.log(sourceName ? `No built-in document found with name "${sourceName}".` : "No built-in documents found.");
    await prisma.$disconnect();
    return;
  }

  for (const doc of docs) {
    console.log(`  Deleting: ${doc.name} [${doc.embeddingModel}] (id=${doc.id})`);
  }

  const { count } = await prisma.document.deleteMany({ where });
  console.log(`\nDeleted ${count} document${count !== 1 ? "s" : ""} (chunks removed via cascade).`);
  await prisma.$disconnect();
}

// ── Entry point ───────────────────────────────────────────────────────────────

const run = mode === "export" ? runExport : mode === "clear" ? runClear : runImport;
run().catch((err) => {
  console.error(err);
  process.exit(1);
});
