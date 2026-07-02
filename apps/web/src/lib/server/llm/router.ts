import { claudeProvider } from "./claude";
import { deepseekProvider } from "./deepseek";
import { openaiProvider } from "./openai";
import type { LLMProvider } from "./types";
import { PROVIDER } from "./providers";

export function getProvider(name?: string): LLMProvider {
  if (name === PROVIDER.DEEPSEEK) return deepseekProvider;
  if (name === PROVIDER.OPENAI) return openaiProvider;
  return claudeProvider;
}
