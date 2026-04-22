import OpenAI from "openai";
import type { LLMProvider } from "./types";

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY ?? "",
  baseURL: "https://api.deepseek.com",
});

export const deepseekProvider: LLMProvider = {
  name: "deepseek",

  async *chat({ system, messages }) {
    const stream = await client.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      max_tokens: 2048,
      stream: true,
      messages: [{ role: "system", content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  },
};
