export const PROVIDER = {
  DEEPSEEK: "deepseek",
  OPENAI: "openai",
  CLAUDE: "claude",
} as const;

export type Provider = (typeof PROVIDER)[keyof typeof PROVIDER];

export const PROVIDER_LABEL: Record<Provider, string> = {
  deepseek: "DeepSeek",
  openai: "OpenAI",
  claude: "Claude",
};
