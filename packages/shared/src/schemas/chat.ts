import { z } from "zod";

export const ChatHistoryMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(8000),
});
export type ChatHistoryMessage = z.infer<typeof ChatHistoryMessageSchema>;

export const ChatRequestInputSchema = z.object({
  question: z.string().min(1).max(4000),
  provider: z.enum(["claude", "deepseek", "openai"]).default("deepseek"),
  history: z.array(ChatHistoryMessageSchema).max(50).default([]),
});
export type ChatRequestInput = z.infer<typeof ChatRequestInputSchema>;
