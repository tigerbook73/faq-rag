import { z } from "zod";
import { PROVIDER, type Provider } from "@/lib/server/llm/providers";
import { config } from "@/lib/shared/config";

// ── Request input types ───────────────────────────────────────────────────────

// History item sent to /api/chat — role + content only, no citations
export const ChatHistoryMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(8000),
});
export type ChatHistoryMessage = z.infer<typeof ChatHistoryMessageSchema>;

export const ChatRequestInputSchema = z.object({
  question: z.string().min(1).max(4000),
  provider: z
    .enum([PROVIDER.CLAUDE, PROVIDER.DEEPSEEK, PROVIDER.OPENAI])
    .default(config.llm.defaultProvider as Provider),
  history: z.array(ChatHistoryMessageSchema).max(50).default([]),
});
export type ChatRequestInput = z.infer<typeof ChatRequestInputSchema>;
