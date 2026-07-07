import { getEmbedding, getEmbeddingModelId } from "../embeddings/router";
import { vectorSearch, type ChunkRow } from "./vector-search";
import { deduplicateAndSort } from "./rerank";
import { detectLang } from "../lang/detect";
import type OpenAI from "openai";
import { resolveQueryClient } from "../llm/clients";
import { config } from "@/lib/shared/config";
import { logger } from "../logger";

async function translateQuery(query: string, targetLang: "zh" | "en", client: OpenAI, model: string): Promise<string> {
  const prompt =
    targetLang === "zh"
      ? `Translate the following query to Chinese. Return only the translation, no explanation:\n${query}`
      : `Translate the following query to English. Return only the translation, no explanation:\n${query}`;

  const resp = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    max_tokens: config.retrieval.queryMaxTokens,
  });

  return resp.choices[0]?.message?.content?.trim() ?? query;
}

async function generateHypotheticalAnswer(query: string, client: OpenAI, model: string): Promise<string> {
  const resp = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "user",
        content: `Write a brief factual answer to the following question. Answer directly, no explanation:\n${query}`,
      },
    ],
    max_tokens: config.retrieval.queryMaxTokens,
  });

  return resp.choices[0]?.message?.content?.trim() ?? query;
}

type RetrieveOptions = {
  traceId?: string;
  provider?: string;
};

export async function retrieve(userQuery: string, options: RetrieveOptions = {}): Promise<ChunkRow[]> {
  const { traceId, provider } = options;
  const { client, model } = resolveQueryClient(provider);
  const t0 = Date.now();
  const srcLang = detectLang(userQuery);
  const targetLang = srcLang === "en" ? "zh" : "en";

  const [translatedQuery, hydeAnswer] = await Promise.all([
    translateQuery(userQuery, targetLang, client, model).catch(() => userQuery),
    generateHypotheticalAnswer(userQuery, client, model).catch(() => null),
  ]);

  const queryZh = srcLang === "zh" ? userQuery : translatedQuery;
  const queryEn = srcLang === "en" ? userQuery : translatedQuery;

  const embedResults = await Promise.all([
    getEmbedding(queryZh),
    getEmbedding(queryEn),
    hydeAnswer ? getEmbedding(hydeAnswer) : Promise.resolve(null),
  ]);
  const [embZh, embEn, embHyde] = embedResults;

  const embeddingModel = getEmbeddingModelId();
  const searchResults = await Promise.all([
    vectorSearch(embZh, config.retrieval.topK, embeddingModel),
    vectorSearch(embEn, config.retrieval.topK, embeddingModel),
    embHyde ? vectorSearch(embHyde, config.retrieval.topK, embeddingModel) : Promise.resolve([]),
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

  if (!config.retrieval.enableReranker) {
    return candidates.slice(0, config.retrieval.topFinal);
  }

  const { rerankChunks } = await import("./cross-encoder");
  return rerankChunks(userQuery, candidates, config.retrieval.topFinal, traceId);
}
