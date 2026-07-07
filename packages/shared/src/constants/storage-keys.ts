// Keys shared verbatim between apps/web (localStorage) and apps/mobile (AsyncStorage).
// Each app extends this with its own platform-specific keys (e.g. web's SCROLL,
// mobile's PROVIDER) rather than adding them here.
export const STORAGE_KEYS = {
  LAST_CHAT: "chat:last",
  DRAFT: (chatId: string) => `chat:draft:${chatId}`,
} as const;
