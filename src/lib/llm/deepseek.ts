import type { LLMProvider } from "./types";
import { PROVIDER } from "./providers";
import { deepseekClient as client } from "./clients";

type DeepSeekUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
};

export const deepseekProvider: LLMProvider = {
  name: PROVIDER.DEEPSEEK,

  async *chat({ system, messages }) {
    const stream = await client.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      max_tokens: 2048,
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
      console.log(
        `[deepseek] cache hit=${hit} miss=${miss} ratio=${ratio}% | prompt=${usage.prompt_tokens} completion=${usage.completion_tokens}`,
      );
    }
  },
};
