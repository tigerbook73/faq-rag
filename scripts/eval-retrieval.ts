/**
 * Retrieval quality evaluation script.
 * Usage: pnpm tsx scripts/eval-retrieval.ts
 *
 * Requires the DB to be running with indexed documents that match the golden set.
 * Each entry: { question, expectedDoc } where expectedDoc is a substring of document name.
 */

import { retrieve } from "../src/lib/retrieval/query";
import { DEFAULT_ADMIN_USER_ID } from "../src/lib/default-users";

interface GoldenEntry {
  question: string;
  expectedDoc: string; // substring match against document_name
}

// ── Golden dataset ─────────────────────────────────────────────────────────
// Replace / extend these with questions that match documents in your knowledge base.
const GOLDEN: GoldenEntry[] = [
  { question: "What is RAG?", expectedDoc: "RAG" },
  { question: "How does vector search work?", expectedDoc: "vector" },
  { question: "什么是检索增强生成？", expectedDoc: "RAG" },
  { question: "How to use pgvector with PostgreSQL?", expectedDoc: "pgvector" },
  { question: "What embedding models are available?", expectedDoc: "embed" },
];

// ── Evaluation ─────────────────────────────────────────────────────────────
async function evaluate() {
  const userId = process.env.EVAL_USER_ID ?? DEFAULT_ADMIN_USER_ID;
  const ks = [1, 3, 5];
  const hits: Record<number, number> = { 1: 0, 3: 0, 5: 0 };

  console.log("=".repeat(60));
  console.log("Retrieval Evaluation — Hit Rate @K");
  console.log("=".repeat(60));

  for (const entry of GOLDEN) {
    let chunks;
    try {
      chunks = await retrieve(entry.question, { userId });
    } catch (err) {
      console.error(`  ERROR retrieving "${entry.question}":`, err);
      continue;
    }

    const names = chunks.map((c) => c.document_name.toLowerCase());
    const target = entry.expectedDoc.toLowerCase();

    for (const k of ks) {
      const hit = names.slice(0, k).some((n) => n.includes(target));
      if (hit) hits[k]++;
    }

    const hitK1 = names[0]?.includes(target) ? "✅" : "❌";
    console.log(`\n  Q: ${entry.question}`);
    console.log(`  Expected doc contains: "${entry.expectedDoc}"`);
    console.log(`  Top-1: ${hitK1}  (${names[0] ?? "—"})`);
    console.log(`  Top-3 docs: ${names.slice(0, 3).join(", ") || "—"}`);
  }

  const n = GOLDEN.length;
  console.log("\n" + "=".repeat(60));
  console.log("Summary");
  console.log("=".repeat(60));
  for (const k of ks) {
    const pct = ((hits[k] / n) * 100).toFixed(0);
    console.log(`  Hit Rate @${k}: ${hits[k]}/${n} (${pct}%)`);
  }
  console.log("=".repeat(60));
}

evaluate().catch((err) => {
  console.error("Evaluation failed:", err);
  process.exit(1);
});
