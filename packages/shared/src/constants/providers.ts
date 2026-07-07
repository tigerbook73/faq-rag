export const PROVIDER = { DEEPSEEK: "deepseek", OPENAI: "openai", CLAUDE: "claude" } as const;
export type Provider = (typeof PROVIDER)[keyof typeof PROVIDER];

export const PROVIDER_LABEL: Record<Provider, string> = {
  deepseek: "DeepSeek",
  openai: "OpenAI",
  claude: "Claude",
};

// Canonical fallback used by both apps when their respective env var
// (NEXT_PUBLIC_DEFAULT_PROVIDER / EXPO_PUBLIC_DEFAULT_PROVIDER) is unset.
export const DEFAULT_PROVIDER: Provider = PROVIDER.DEEPSEEK;
