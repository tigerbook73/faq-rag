export const PROVIDER = {
  CLAUDE: "claude",
  DEEPSEEK: "deepseek",
} as const;

export type Provider = (typeof PROVIDER)[keyof typeof PROVIDER];

export const PROVIDER_LABEL: Record<Provider, string> = {
  claude: "Claude",
  deepseek: "DeepSeek",
};
