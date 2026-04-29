import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "text-embedding-3-small";
const DIMENSIONS = 1024;

export async function getEmbeddingOpenAI(text: string): Promise<number[]> {
  const res = await client.embeddings.create({
    model: MODEL,
    input: text,
    dimensions: DIMENSIONS,
  });
  return res.data[0].embedding;
}

export async function getEmbeddingsBatchOpenAI(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await client.embeddings.create({
    model: MODEL,
    input: texts,
    dimensions: DIMENSIONS,
  });
  return res.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}
