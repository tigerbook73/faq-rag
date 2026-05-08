export const STORAGE_KEYS = {
  LAST_CHAT: "chat:last",
  DRAFT: (chatId: string) => `chat:draft:${chatId}`,
  SCROLL: (chatId: string) => `chat:scroll:${chatId}`,
} as const;
