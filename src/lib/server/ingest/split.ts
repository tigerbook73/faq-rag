import { RecursiveCharacterTextSplitter, MarkdownTextSplitter } from "@langchain/textsplitters";
import { config } from "@/lib/shared/config";
import { splitTextSemantic } from "./semantic-splitter";

const fixedSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: config.chunking.size,
  chunkOverlap: config.chunking.overlap,
});

const mdSplitter = new MarkdownTextSplitter({
  chunkSize: config.chunking.size,
  chunkOverlap: config.chunking.overlap,
});

// Fixed-size fallback — used by semantic splitter internally for oversized chunks
export async function splitTextFixed(text: string): Promise<string[]> {
  return fixedSplitter.splitText(text);
}

// Default: semantic chunking with fixed-size fallback for short texts / large chunks
export async function splitText(text: string): Promise<string[]> {
  return splitTextSemantic(text);
}

// Strips NestJS doc system annotations before chunking
function stripNestjsAnnotations(text: string): string {
  return text.replace(/@@filename\([^)]*\)\n?/g, "").replace(/@@switch\n?/g, "");
}

// Markdown-aware splitting — respects heading boundaries (##, ###, ####)
export async function splitTextMarkdown(text: string): Promise<string[]> {
  return mdSplitter.splitText(stripNestjsAnnotations(text));
}
