import { z } from "zod";
import { DEFAULT_PROVIDER, PROVIDER, type Provider } from "../providers";

export const ChatHistoryMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(8000),
});
export type ChatHistoryMessage = z.infer<typeof ChatHistoryMessageSchema>;

export function createChatRequestInputSchema(defaultProvider: Provider = DEFAULT_PROVIDER) {
  return z.object({
    question: z.string().min(1).max(4000),
    provider: z.enum([PROVIDER.CLAUDE, PROVIDER.DEEPSEEK, PROVIDER.OPENAI]).default(defaultProvider),
    history: z.array(ChatHistoryMessageSchema).max(50).default([]),
  });
}

export const ChatRequestInputSchema = createChatRequestInputSchema();
export type ChatRequestInput = z.infer<typeof ChatRequestInputSchema>;
