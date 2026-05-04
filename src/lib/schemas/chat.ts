import {
  ChatHistoryMessageSchema,
  createChatRequestInputSchema,
  type ChatHistoryMessage,
  type ChatRequestInput,
} from "@faq-rag/shared";
import { config } from "@/lib/config";

// ── Request input types ───────────────────────────────────────────────────────

// History item sent to /api/chat — role + content only, no citations
export { ChatHistoryMessageSchema, type ChatHistoryMessage, type ChatRequestInput };

export const ChatRequestInputSchema = createChatRequestInputSchema(config.llm.defaultProvider);
