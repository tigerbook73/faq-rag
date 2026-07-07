import { z } from "zod";
import { PROVIDER, DEFAULT_PROVIDER } from "../constants/providers";

export const ChatHistoryMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(8000),
});
export type ChatHistoryMessage = z.infer<typeof ChatHistoryMessageSchema>;

// Server-side fallback when the request omits `provider`. Fixed to the shared
// DEFAULT_PROVIDER (not env-driven) — per-app UI default selection is a
// separate concern, handled by each app's provider-context using its own env var.
export const ChatRequestInputSchema = z.object({
  question: z.string().min(1).max(4000),
  provider: z.enum([PROVIDER.CLAUDE, PROVIDER.DEEPSEEK, PROVIDER.OPENAI]).default(DEFAULT_PROVIDER),
  history: z.array(ChatHistoryMessageSchema).max(50).default([]),
});
export type ChatRequestInput = z.infer<typeof ChatRequestInputSchema>;
