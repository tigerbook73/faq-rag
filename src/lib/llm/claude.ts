import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider } from "./types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const claudeProvider: LLMProvider = {
  name: "claude",

  async *chat({ system, messages }) {
    const stream = client.messages.stream({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 2048,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
  },
};
