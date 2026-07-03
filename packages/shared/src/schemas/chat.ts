import { z } from "zod";

export const ChatHistoryMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(8000),
});
export type ChatHistoryMessage = z.infer<typeof ChatHistoryMessageSchema>;

// Provider values must be kept in sync with apps/web/src/lib/server/llm/providers.ts's
// PROVIDER const — packages/shared cannot import from an app, so this list is duplicated.
// Default matches the project-wide fallback (claude), not an env-driven value, since
// NEXT_PUBLIC_DEFAULT_PROVIDER is a Next.js-only mechanism unavailable to this package.
export const ChatRequestInputSchema = z.object({
  question: z.string().min(1).max(4000),
  provider: z.enum(["claude", "deepseek", "openai"]).default("claude"),
  history: z.array(ChatHistoryMessageSchema).max(50).default([]),
});
export type ChatRequestInput = z.infer<typeof ChatRequestInputSchema>;
