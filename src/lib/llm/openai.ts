import OpenAI from "openai";
import type { LLMProvider } from "./types";
import { PROVIDER } from "./providers";
import { config } from "../config";
import { logger } from "../logger";
import { getOpenaiClient } from "./clients";

export const openaiProvider: LLMProvider = {
  name: PROVIDER.OPENAI,

  async *chat({ system, messages }) {
    const stream = await getOpenaiClient().chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      max_tokens: config.llm.maxTokens,
      stream: true,
      stream_options: { include_usage: true },
      messages: [{ role: "system", content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))],
    });

    let usage: OpenAI.CompletionUsage | null = null;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
      if (chunk.usage) usage = chunk.usage;
    }

    if (usage) {
      logger.debug(
        {
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
        },
        "openai usage",
      );
    }
  },
};
