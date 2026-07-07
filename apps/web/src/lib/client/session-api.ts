import { z } from "zod";
import {
  SessionRawSchema,
  toSession,
  type Message,
  type Citation,
  type UpdateSessionInput,
  type ChatSession,
  type ChatRequestInput,
} from "@faq-rag/shared";

export type { Message, Citation, ChatSession };

export async function fetchSessions(): Promise<ChatSession[]> {
  const res = await fetch("/api/sessions");
  if (!res.ok) throw new Error(`Failed to fetch sessions: ${res.status}`);
  const data = z.array(SessionRawSchema).parse(await res.json());
  return data.map(toSession);
}

export async function fetchSession(id: string): Promise<ChatSession | null> {
  const res = await fetch(`/api/sessions/${id}`);
  if (!res.ok) return null;
  const data = SessionRawSchema.parse(await res.json());
  return toSession(data);
}

export async function upsertSession(session: ChatSession): Promise<void> {
  const body: UpdateSessionInput = { title: session.title, messages: session.messages };
  const res = await fetch(`/api/sessions/${session.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.warn("[upsertSession] PATCH failed", res.status, await res.json().catch(() => null));
  }
}

export async function updateSessionTitle(id: string, title: string): Promise<void> {
  const body: UpdateSessionInput = { title };
  await fetch(`/api/sessions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function apiDeleteSession(id: string): Promise<void> {
  await fetch(`/api/sessions/${id}`, { method: "DELETE" });
}

export async function startChatStream(input: ChatRequestInput): Promise<Response> {
  return fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
