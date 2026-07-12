/**
 * Seed script for pre-computing embeddings and importing them into the DB.
 * Run `bun scripts/seed.ts --help` for full usage.
 *
 *   generate [input-file]  Compute embeddings for a source doc → write a seed .jsonl.
 *                          When [input-file] is omitted, runs once for every file in
 *                          sample-docs/ that is not a previously-generated `.jsonl`
 *                          output and not a `.questions.json` sidecar.
 *   load [seed-file]       Load a seed .jsonl into the DB.
 *                          When [seed-file] is omitted, loads every `.jsonl` file in
 *                          sample-docs/. In production (NODE_ENV=production, "remote")
 *                          only `*-openai.jsonl` files are loaded; otherwise
 *                          ("local"/dev) all `.jsonl` files are loaded.
 *   clear [source-name]    Delete built-in documents (all if name omitted).
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
import { fileURLToPath } from "url";
import { cac } from "cac";
import { PrismaPg } from "@prisma/adapter-pg";
import type { PrismaClient } from "../src/generated/prisma/client";

// ── Constants ─────────────────────────────────────────────────────────────────

const OPENAI_MODEL_NAME = "text-embedding-3-small";
const LOCAL_MODEL_NAME = "bge-m3";

/** Directory holding built-in source docs + their generated seed files. Resolved
 *  relative to this script file (not process.cwd()) so it works regardless of
 *  the invoking working directory. */
const SAMPLE_DOCS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "sample-docs");

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

async function listSampleDocsDir() {
  try {
    return await fs.readdir(SAMPLE_DOCS_DIR, { withFileTypes: true });
  } catch {
    return [];
  }
}

/** Built-in source docs for `generate`: every file under sample-docs/ that is not
 *  a previously-generated `.jsonl` seed file and not a `.questions.json` sidecar. */
async function discoverGenerateInputs(): Promise<string[]> {
  const entries = await listSampleDocsDir();
  return entries
    .filter((e) => e.isFile() && !e.name.endsWith(".jsonl") && !e.name.endsWith(".questions.json"))
    .map((e) => e.name)
    .sort()
    .map((name) => path.join(SAMPLE_DOCS_DIR, name));
}

/** Built-in seed files for `load`: every `*.jsonl` under sample-docs/. In production
 *  (NODE_ENV=production, "remote") only `*-openai.jsonl` is included; otherwise
 *  ("local"/dev) all `*.jsonl` variants are included. */
async function discoverLoadInputs(): Promise<string[]> {
  const entries = await listSampleDocsDir();
  const isProd = process.env.NODE_ENV === "production";
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".jsonl") && (!isProd || e.name.endsWith("-openai.jsonl")))
    .map((e) => e.name)
    .sort()
    .map((name) => path.join(SAMPLE_DOCS_DIR, name));
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

/** Reads the optional `<sourceBaseName>.questions.json` sidecar next to a seed file. */
async function loadSampleQuestions(seedDir: string, sourceBaseName: string): Promise<string[]> {
  const sidecarPath = path.join(seedDir, `${sourceBaseName}.questions.json`);
  try {
    const parsed = JSON.parse(await fs.readFile(sidecarPath, "utf-8"));
    if (Array.isArray(parsed) && parsed.every((q) => typeof q === "string")) return parsed;
  } catch {
    // No sidecar file — sample questions are optional.
  }
  return [];
}

/** Idempotently backfills sample questions for a document from its sidecar file, if any. */
async function syncSampleQuestions(
  prisma: PrismaClient,
  documentId: string,
  seedDir: string,
  sourceBaseName: string,
): Promise<void> {
  const questions = await loadSampleQuestions(seedDir, sourceBaseName);
  if (questions.length === 0) return;

  const count = await prisma.sampleQuestion.count({ where: { documentId } });
  if (count > 0) return;

  await prisma.sampleQuestion.createMany({
    data: questions.map((question) => ({ documentId, question })),
  });
  console.log(`  Inserted ${questions.length} sample questions`);
}

// ── Generate mode ─────────────────────────────────────────────────────────────

async function generateOne(
  inputPath: string,
  modelType: SeedModelType,
  modelName: string,
  embedFn: (texts: string[]) => Promise<number[][]>,
  outDirFlag: string | undefined,
): Promise<void> {
  const resolvedInput = path.resolve(inputPath);

  const outDir = outDirFlag ? path.resolve(outDirFlag) : path.dirname(resolvedInput);
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
      .map((content, j): SeedChunk => ({
        type: "chunk",
        ord: ord + j,
        content,
        lang: detectLang(content),
        embedding: encodeEmbedding(embeddings[j]),
      }))
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

async function runGenerate(
  explicitInput: string | undefined,
  modelFlag: SeedModelType | undefined,
  outDirFlag: string | undefined,
) {
  // Determine model type (shared across the whole batch)
  const useOpenAI = process.env.EMBEDDING_PROVIDER === "openai";
  const modelType: SeedModelType = modelFlag ?? (useOpenAI ? "openai" : "local");
  const modelName = modelType === "openai" ? OPENAI_MODEL_NAME : LOCAL_MODEL_NAME;

  let embedFn: (texts: string[]) => Promise<number[][]>;
  if (modelType === "openai") {
    const { getEmbeddingsBatchOpenAI } = await import("../src/lib/server/embeddings/openai-embed");
    embedFn = getEmbeddingsBatchOpenAI;
  } else {
    const { getEmbeddingsBatch } = await import("../src/lib/server/embeddings/bge");
    embedFn = getEmbeddingsBatch;
  }

  const inputFiles = explicitInput ? [explicitInput] : await discoverGenerateInputs();
  if (inputFiles.length === 0) {
    console.error(`No built-in source documents found in ${SAMPLE_DOCS_DIR}.`);
    process.exit(1);
  }
  if (!explicitInput) {
    console.log(`No input file given — generating for ${inputFiles.length} built-in doc(s) in sample-docs/:`);
    for (const f of inputFiles) console.log(`  - ${path.basename(f)}`);
  }

  let hadError = false;
  for (const inputPath of inputFiles) {
    try {
      await generateOne(inputPath, modelType, modelName, embedFn, outDirFlag);
    } catch (err) {
      hadError = true;
      console.error(`  Failed: ${path.basename(inputPath)}:`, err);
    }
  }
  if (hadError) process.exit(1);
}

// ── Load mode ─────────────────────────────────────────────────────────────────

async function loadOne(prisma: PrismaClient, seedPath: string): Promise<void> {
  const resolvedSeed = path.resolve(seedPath);

  // Read first line as meta
  const lines = readJsonlLines(resolvedSeed);
  const firstLine = await lines.next();
  if (firstLine.done) {
    throw new Error("Empty seed file.");
  }
  const firstObj = firstLine.value as Record<string, unknown>;
  if (firstObj.type !== "meta" || firstObj.version !== 1 || firstObj.encoding !== "float32-base64") {
    throw new Error("Unsupported seed file format.");
  }
  if (firstObj.model !== "openai" && firstObj.model !== "local") {
    throw new Error(`Unknown model type: ${firstObj.model}. Expected "openai" or "local".`);
  }
  const meta = firstObj as unknown as SeedMeta;

  const embeddingModel = meta.model === "openai" ? "text-embedding-3-small" : "bge-m3";
  // contentHash is deterministic by source + modelName (excludes generatedAt so re-exports are idempotent)
  const contentHash = crypto
    .createHash("sha256")
    .update(meta.source + meta.modelName)
    .digest("hex");

  console.log(`Importing: ${meta.source} (model: ${meta.modelName})`);

  const seedDir = path.dirname(resolvedSeed);
  const sourceBaseName = path.basename(meta.source, path.extname(meta.source));

  // Dedup check using compound key — re-import replaces the existing document
  // (chunks + sample questions cascade-delete with it) rather than skipping it.
  const existing = await prisma.document.findUnique({
    where: { contentHash_embeddingModel: { contentHash, embeddingModel } },
  });
  if (existing) {
    console.log(`  Already imported (id=${existing.id}). Deleting and re-importing…`);
    await prisma.document.delete({ where: { id: existing.id } });
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

  await syncSampleQuestions(prisma, doc.id, seedDir, sourceBaseName);

  await prisma.document.update({
    where: { id: doc.id },
    data: { status: "indexed" },
  });

  console.log(`\nImport complete. Document id=${doc.id}`);
}

async function runLoad(explicitSeed: string | undefined) {
  const seedFiles = explicitSeed ? [explicitSeed] : await discoverLoadInputs();
  if (seedFiles.length === 0) {
    const suffix = process.env.NODE_ENV === "production" ? " matching *-openai.jsonl" : "";
    console.error(`No built-in seed files found in ${SAMPLE_DOCS_DIR}${suffix}.`);
    process.exit(1);
  }
  if (!explicitSeed) {
    const envLabel = process.env.NODE_ENV === "production" ? "remote: *-openai.jsonl only" : "local: all *.jsonl";
    console.log(`No seed file given — loading ${seedFiles.length} built-in seed(s) from sample-docs/ (${envLabel}):`);
    for (const f of seedFiles) console.log(`  - ${path.basename(f)}`);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) console.log(`  DB: ${dbUrl.replace(/:[^:@]+@/, ":***@")}`);

  // Dynamic import AFTER env override
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  let hadError = false;
  try {
    for (const seedPath of seedFiles) {
      try {
        await loadOne(prisma, seedPath);
      } catch (err) {
        hadError = true;
        console.error(`  Failed: ${path.basename(seedPath)}:`, err);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
  if (hadError) process.exit(1);
}

// ── Clear mode ────────────────────────────────────────────────────────────────

async function runClear(sourceName: string | undefined) {
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

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

// ── CLI ───────────────────────────────────────────────────────────────────────

async function withErrorHandling(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

const cli = cac("bun scripts/seed");

cli.usage("<command> [options]");

cli.command("").action(() => {
  cli.outputHelp();
});

cli
  .command(
    "generate [input-file]",
    "Generate seed .jsonl from a source doc (all built-in docs in sample-docs/ if omitted)",
  )
  .option("--model <type>", "Embedding model: openai | local")
  .option("--out-dir <dir>", "Output directory (defaults to next to each source file)")
  .action(async (inputFile: string | undefined, options: { model?: SeedModelType; outDir?: string }) => {
    await withErrorHandling(() => runGenerate(inputFile, options.model, options.outDir));
  });

cli
  .command("load [seed-file]", "Load a seed .jsonl into the DB (all built-in seeds in sample-docs/ if omitted)")
  .action(async (seedFile: string | undefined) => {
    await withErrorHandling(() => runLoad(seedFile));
  });

cli
  .command("clear [source-name]", "Delete built-in documents (all built-in docs if name omitted)")
  .action(async (sourceName: string | undefined) => {
    await withErrorHandling(() => runClear(sourceName));
  });

cli.help();
cli.parse();
