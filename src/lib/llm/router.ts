import { claudeProvider } from "./claude";
import { deepseekProvider } from "./deepseek";
import type { LLMProvider } from "./types";
import { PROVIDER } from "./providers";

export function getProvider(name?: string): LLMProvider {
  if (name === PROVIDER.DEEPSEEK) return deepseekProvider;
  return claudeProvider;
}
