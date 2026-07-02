import { STORAGE_KEYS } from "./constants";

function isClient() {
  return typeof window !== "undefined";
}

export const lastChat = {
  get(): string | null {
    if (!isClient()) return null;
    return sessionStorage.getItem(STORAGE_KEYS.LAST_CHAT);
  },
  set(id: string): void {
    if (!isClient()) return;
    sessionStorage.setItem(STORAGE_KEYS.LAST_CHAT, id);
  },
  clear(): void {
    if (!isClient()) return;
    sessionStorage.removeItem(STORAGE_KEYS.LAST_CHAT);
  },
};

export function getLastChatHref(): string {
  const lastId = lastChat.get();
  return lastId ? `/chat/${lastId}` : "/chat/new";
}
