import type { Citation } from "@/src/components/chat/CitationDrawer";

export interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const LAST_KEY = "chat:last";

let sessionsCache: ChatSession[] | null = null;

function invalidateCache() {
  sessionsCache = null;
}

function sessionKey(id: string) {
  return `chat:${id}`;
}

export function pruneOldSessions(): void {
  const now = Date.now();
  let pruned = false;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith("chat:") || key === LAST_KEY) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const session: ChatSession = JSON.parse(raw);
      if (now - session.updatedAt > TWO_DAYS_MS) {
        localStorage.removeItem(key);
        i--;
        pruned = true;
      }
    } catch {
      localStorage.removeItem(key);
      i--;
      pruned = true;
    }
  }
  if (pruned) invalidateCache();
}

export function createSession(id: string): ChatSession {
  const session: ChatSession = {
    id,
    title: "New Chat",
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  localStorage.setItem(sessionKey(id), JSON.stringify(session));
  return session;
}

export function getSession(id: string): ChatSession | null {
  const raw = localStorage.getItem(sessionKey(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ChatSession;
  } catch {
    return null;
  }
}

export function saveSession(session: ChatSession): void {
  localStorage.setItem(sessionKey(session.id), JSON.stringify(session));
  invalidateCache();
}

export function listSessions(): ChatSession[] {
  if (sessionsCache) return sessionsCache;
  const sessions: ChatSession[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith("chat:") || key === LAST_KEY) continue;
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      sessions.push(JSON.parse(raw) as ChatSession);
    } catch {
      // skip corrupted entries
    }
  }
  sessionsCache = sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  return sessionsCache;
}

export function deleteSession(id: string): void {
  localStorage.removeItem(sessionKey(id));
  if (getLastChatId() === id) localStorage.removeItem(LAST_KEY);
  invalidateCache();
}

export function getLastChatId(): string | null {
  return localStorage.getItem(LAST_KEY);
}

export function setLastChatId(id: string): void {
  localStorage.setItem(LAST_KEY, id);
}
