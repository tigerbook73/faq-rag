import { getEmbedding } from "../embeddings/bge";
import { vectorSearch, type ChunkRow } from "./vector-search";
import { deduplicateAndSort } from "./rerank";
import { rerankChunks } from "./cross-encoder";
import { detectLang } from "../lang/detect";
import { deepseekClient } from "../llm/clients";
import { RETRIEVAL_TOP_K, RETRIEVAL_TOP_FINAL, QUERY_MAX_TOKENS } from "../config";

async function translateQuery(query: string, targetLang: "zh" | "en"): Promise<string> {
  const prompt =
    targetLang === "zh"
      ? `Translate the following query to Chinese. Return only the translation, no explanation:\n${query}`
      : `将以下查询翻译为英语。只返回翻译结果，不要解释：\n${query}`;

  const resp = await deepseekClient.chat.completions.create({
    model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
    messages: [{ role: "user", content: prompt }],
    max_tokens: QUERY_MAX_TOKENS,
  });

  return resp.choices[0]?.message?.content?.trim() ?? query;
}

async function generateHypotheticalAnswer(query: string): Promise<string> {
  const resp = await deepseekClient.chat.completions.create({
    model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
    messages: [{
      role: "user",
      content: `Write a brief factual answer to the following question. Answer directly, no explanation:\n${query}`,
    }],
    max_tokens: QUERY_MAX_TOKENS,
  });

  return resp.choices[0]?.message?.content?.trim() ?? query;
}

export async function retrieve(userQuery: string): Promise<ChunkRow[]> {
  const srcLang = detectLang(userQuery);
  const targetLang = srcLang === "en" ? "zh" : "en";

  // translation and HyDE generation run in parallel
  const [translatedQuery, hydeAnswer] = await Promise.all([
    translateQuery(userQuery, targetLang).catch(() => userQuery),
    generateHypotheticalAnswer(userQuery).catch(() => null),
  ]);

  const queryZh = srcLang === "zh" ? userQuery : translatedQuery;
  const queryEn = srcLang === "en" ? userQuery : translatedQuery;

  // embed all queries in parallel
  const embedResults = await Promise.all([
    getEmbedding(queryZh),
    getEmbedding(queryEn),
    hydeAnswer ? getEmbedding(hydeAnswer) : Promise.resolve(null),
  ]);
  const [embZh, embEn, embHyde] = embedResults;

  // vector search in parallel across all query vectors
  const searchResults = await Promise.all([
    vectorSearch(embZh, RETRIEVAL_TOP_K),
    vectorSearch(embEn, RETRIEVAL_TOP_K),
    embHyde ? vectorSearch(embHyde, RETRIEVAL_TOP_K) : Promise.resolve([]),
  ]);

  const candidates = deduplicateAndSort(searchResults.flat());
  return rerankChunks(userQuery, candidates, RETRIEVAL_TOP_FINAL);
}
