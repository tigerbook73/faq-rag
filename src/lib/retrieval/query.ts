import { getEmbedding } from "../embeddings/router";
import { vectorSearch, type ChunkRow } from "./vector-search";
import { deduplicateAndSort } from "./rerank";
// import { rerankChunks } from "./cross-encoder";
import { detectLang } from "../lang/detect";
import { deepseekClient, openaiClient } from "../llm/clients";
import { RETRIEVAL_TOP_K, RETRIEVAL_TOP_FINAL, QUERY_MAX_TOKENS } from "../config";
import { logger } from "../logger";

function resolveClient(provider?: string) {
  if (provider === "openai") {
    return { client: openaiClient, model: process.env.OPENAI_MODEL ?? "gpt-4o-mini" };
  }
  return { client: deepseekClient, model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat" };
}

async function translateQuery(
  query: string,
  targetLang: "zh" | "en",
  client: typeof deepseekClient,
  model: string,
): Promise<string> {
  const prompt =
    targetLang === "zh"
      ? `Translate the following query to Chinese. Return only the translation, no explanation:\n${query}`
      : `将以下查询翻译为英语。只返回翻译结果，不要解释：\n${query}`;

  const resp = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    max_tokens: QUERY_MAX_TOKENS,
  });

  return resp.choices[0]?.message?.content?.trim() ?? query;
}

async function generateHypotheticalAnswer(
  query: string,
  client: typeof deepseekClient,
  model: string,
): Promise<string> {
  const resp = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "user",
        content: `Write a brief factual answer to the following question. Answer directly, no explanation:\n${query}`,
      },
    ],
    max_tokens: QUERY_MAX_TOKENS,
  });

  return resp.choices[0]?.message?.content?.trim() ?? query;
}

export async function retrieve(userQuery: string, traceId?: string, provider?: string): Promise<ChunkRow[]> {
  const { client, model } = resolveClient(provider);
  const t0 = Date.now();
  const srcLang = detectLang(userQuery);
  const targetLang = srcLang === "en" ? "zh" : "en";

  // translation and HyDE generation run in parallel
  const [translatedQuery, hydeAnswer] = await Promise.all([
    translateQuery(userQuery, targetLang, client, model).catch(() => userQuery),
    generateHypotheticalAnswer(userQuery, client, model).catch(() => null),
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

  logger.debug(
    {
      traceId,
      retrieval_ms: Date.now() - t0,
      src_lang: srcLang,
      hyde: !!hydeAnswer,
      candidates: candidates.length,
      top_vector_score: candidates[0]?.score != null ? Number(candidates[0].score).toFixed(4) : null,
    },
    "vector search done",
  );

  return candidates.slice(0, RETRIEVAL_TOP_FINAL);
  // For better relevance, we can rerank the candidates with a cross-encoder, but it adds latency. Uncomment to enable.
  // return rerankChunks(userQuery, candidates, RETRIEVAL_TOP_FINAL, traceId);
}
