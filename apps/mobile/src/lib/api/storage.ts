import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Provider } from "./chat";

// Naming mirrors apps/web/src/lib/client/constants.ts's STORAGE_KEYS.
const KEYS = {
  LAST_CHAT: "chat:last",
  DRAFT: (chatId: string) => `chat:draft:${chatId}`,
  PROVIDER: "chat:provider",
} as const;

export async function getLastChat(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.LAST_CHAT);
}

export async function setLastChat(id: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.LAST_CHAT, id);
}

export async function getDraft(chatId: string): Promise<string> {
  return (await AsyncStorage.getItem(KEYS.DRAFT(chatId))) ?? "";
}

export async function setDraft(chatId: string, text: string): Promise<void> {
  if (text) await AsyncStorage.setItem(KEYS.DRAFT(chatId), text);
  else await AsyncStorage.removeItem(KEYS.DRAFT(chatId));
}

export async function getStoredProvider(): Promise<Provider | null> {
  return (await AsyncStorage.getItem(KEYS.PROVIDER)) as Provider | null;
}

export async function setStoredProvider(provider: Provider): Promise<void> {
  await AsyncStorage.setItem(KEYS.PROVIDER, provider);
}
