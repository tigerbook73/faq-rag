import { getEmbedding } from "../embeddings/bge";
import { vectorSearch, type ChunkRow } from "./vector-search";
import { deduplicateAndSort } from "./rerank";
import { detectLang } from "../lang/detect";
import OpenAI from "openai";

const TOP_K = 8;
const TOP_FINAL = 6;

async function translateQuery(query: string, targetLang: "zh" | "en"): Promise<string> {
  const deepseek = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY ?? "",
    baseURL: "https://api.deepseek.com",
  });

  const prompt =
    targetLang === "zh"
      ? `Translate the following query to Chinese. Return only the translation, no explanation:\n${query}`
      : `将以下查询翻译为英语。只返回翻译结果，不要解释：\n${query}`;

  const resp = await deepseek.chat.completions.create({
    model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 200,
  });

  return resp.choices[0]?.message?.content?.trim() ?? query;
}

export async function retrieve(userQuery: string): Promise<ChunkRow[]> {
  const srcLang = detectLang(userQuery);

  let queryZh = userQuery;
  let queryEn = userQuery;

  try {
    if (srcLang === "en") {
      queryZh = await translateQuery(userQuery, "zh");
    } else {
      queryEn = await translateQuery(userQuery, "en");
    }
  } catch {
    // if translation fails, proceed with single-language search
  }

  const [embZh, embEn] = await Promise.all([getEmbedding(queryZh), getEmbedding(queryEn)]);

  const [resZh, resEn] = await Promise.all([vectorSearch(embZh, TOP_K), vectorSearch(embEn, TOP_K)]);

  return deduplicateAndSort([...resZh, ...resEn]).slice(0, TOP_FINAL);
}
