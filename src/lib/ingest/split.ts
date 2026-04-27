import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { CHUNK_SIZE, CHUNK_OVERLAP } from "../config";
import { splitTextSemantic } from "./semantic-splitter";

const fixedSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
});

// Fixed-size fallback — used by semantic splitter internally for oversized chunks
export async function splitTextFixed(text: string): Promise<string[]> {
  return fixedSplitter.splitText(text);
}

// Default: semantic chunking with fixed-size fallback for short texts / large chunks
export async function splitText(text: string): Promise<string[]> {
  return splitTextSemantic(text);
}
