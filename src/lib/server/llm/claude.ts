import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider } from "./types";
import { PROVIDER } from "./providers";
import { config } from "@/lib/shared/config";
import { logger } from "../logger";
import { getAnthropicClient } from "./clients";

export const claudeProvider: LLMProvider = {
  name: PROVIDER.CLAUDE,

  async *chat({ system, messages }) {
    const lastAssistantIdx = messages.reduce((found, msg, idx) => (msg.role === "assistant" ? idx : found), -1);

    const stream = getAnthropicClient().messages.stream({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: config.llm.maxTokens,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: messages.map((m, i) => {
        const addCache = i === lastAssistantIdx || (i === messages.length - 1 && m.role === "user");
        if (addCache) {
          return {
            role: m.role,
            content: [
              {
                type: "text" as const,
                text: m.content,
                cache_control: { type: "ephemeral" as const },
              },
            ],
          };
        }
        return { role: m.role, content: m.content };
      }),
    });

    stream.on("message", (msg) => {
      const u = msg.usage as Anthropic.Usage & {
        cache_creation_input_tokens?: number;
        cache_read_input_tokens?: number;
      };
      const creation = u.cache_creation_input_tokens ?? 0;
      const read = u.cache_read_input_tokens ?? 0;
      const total = u.input_tokens + creation + read;
      const ratio = total > 0 ? ((read / total) * 100).toFixed(1) : "n/a";
      logger.debug(
        {
          cache_read: read,
          cache_created: creation,
          ratio,
          input_tokens: u.input_tokens,
        },
        "claude usage",
      );
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
  },
};
