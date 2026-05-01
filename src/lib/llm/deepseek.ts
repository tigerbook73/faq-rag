import type { LLMProvider } from "./types";
import { PROVIDER } from "./providers";
import { getDeepseekClient } from "./clients";
import { config } from "../config";
import { logger } from "../logger";

type DeepSeekUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
};

export const deepseekProvider: LLMProvider = {
  name: PROVIDER.DEEPSEEK,

  async *chat({ system, messages }) {
    const stream = await getDeepseekClient().chat.completions.create({
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      max_tokens: config.llm.maxTokens,
      stream: true,
      stream_options: { include_usage: true },
      messages: [{ role: "system", content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))],
    });

    let usage: DeepSeekUsage | null = null;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
      if (chunk.usage) usage = chunk.usage as unknown as DeepSeekUsage;
    }

    if (usage) {
      const hit = usage.prompt_cache_hit_tokens ?? 0;
      const miss = usage.prompt_cache_miss_tokens ?? 0;
      const total = hit + miss;
      const ratio = total > 0 ? ((hit / total) * 100).toFixed(1) : "n/a";
      logger.debug(
        {
          cache_hit: hit,
          cache_miss: miss,
          ratio,
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
        },
        "deepseek usage",
      );
    }
  },
};
