import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

let _deepseek: OpenAI | undefined;
export function getDeepseekClient(): OpenAI {
  return (_deepseek ??= new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY ?? "",
    baseURL: "https://api.deepseek.com",
  }));
}

let _openai: OpenAI | undefined;
export function getOpenaiClient(): OpenAI {
  return (_openai ??= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY ?? "",
  }));
}

let _anthropic: Anthropic | undefined;
export function getAnthropicClient(): Anthropic {
  return (_anthropic ??= new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY ?? "",
  }));
}

export function resolveQueryClient(provider?: string): { client: OpenAI; model: string } {
  if (provider === "openai") {
    return { client: getOpenaiClient(), model: process.env.OPENAI_MODEL ?? "gpt-4o-mini" };
  }
  return { client: getDeepseekClient(), model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat" };
}
