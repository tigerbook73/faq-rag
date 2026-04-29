import type { Citation } from "@/components/chat/CitationDrawer";
import { STORAGE_KEYS } from "./constants";

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

function isClient() {
  return typeof window !== "undefined";
}

export function getLastChatId(): string | null {
  if (!isClient()) return null;
  return sessionStorage.getItem(STORAGE_KEYS.LAST_CHAT);
}

export function setLastChatId(id: string): void {
  if (!isClient()) return;
  sessionStorage.setItem(STORAGE_KEYS.LAST_CHAT, id);
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
      citations: Array.isArray(m.citations) ? (m.citations as Citation[]) : undefined,
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
  const res = await fetch(`/api/sessions/${session.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: session.title, messages: session.messages }),
  });
  if (!res.ok) {
    console.warn("[upsertSession] PATCH failed", res.status, await res.json().catch(() => null));
  }
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
