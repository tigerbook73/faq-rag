import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { config } from "../config";
import { splitTextSemantic } from "./semantic-splitter";

const fixedSplitter = new RecursiveCharacterTextSplitter({
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
