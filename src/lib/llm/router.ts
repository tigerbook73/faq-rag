import { claudeProvider } from "./claude";
import { deepseekProvider } from "./deepseek";
import type { LLMProvider } from "./types";

export function getProvider(name?: string): LLMProvider {
  if (name === "deepseek") return deepseekProvider;
  return claudeProvider;
}
