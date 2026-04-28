import type { Citation } from "@/components/chat/CitationDrawer";

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

const LAST_KEY = "chat:last";

function isClient() {
  return typeof window !== "undefined";
}

export function getLastChatId(): string | null {
  if (!isClient()) return null;
  return localStorage.getItem(LAST_KEY);
}

export function setLastChatId(id: string): void {
  if (!isClient()) return;
  localStorage.setItem(LAST_KEY, id);
}

function toSession(raw: {
  id: string;
  title: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  messages?: Array<{ role: string; content: string; citations: unknown }>;
}): ChatSession {
  return {
    id: raw.id,
    title: raw.title,
    createdAt: new Date(raw.createdAt).getTime(),
    updatedAt: new Date(raw.updatedAt).getTime(),
    messages: (raw.messages ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
      citations: (m.citations as Citation[] | null) ?? undefined,
    })),
  };
}

export async function fetchSessions(): Promise<ChatSession[]> {
  const res = await fetch("/api/sessions");
  if (!res.ok) return [];
  const data = await res.json();
  return data.map(toSession);
}

export async function fetchSession(id: string): Promise<ChatSession | null> {
  const res = await fetch(`/api/sessions/${id}`);
  if (!res.ok) return null;
  return toSession(await res.json());
}

export async function upsertSession(session: ChatSession): Promise<void> {
  await fetch(`/api/sessions/${session.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: session.title, messages: session.messages }),
  });
}

export async function updateSessionTitle(id: string, title: string): Promise<void> {
  await fetch(`/api/sessions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
}

export async function apiDeleteSession(id: string): Promise<void> {
  await fetch(`/api/sessions/${id}`, { method: "DELETE" });
}
