import { STORAGE_KEYS as SHARED_STORAGE_KEYS } from "@faq-rag/shared";

export const STORAGE_KEYS = {
  ...SHARED_STORAGE_KEYS,
  SCROLL: (chatId: string) => `chat:scroll:${chatId}`,
} as const;
