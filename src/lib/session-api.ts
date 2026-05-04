import { z } from "zod";
import {
  MessageSchema,
  SessionSummarySchema,
  type Message,
  type Citation,
  type UpdateSessionInput,
} from "./schemas/session";

export type { Message, Citation };

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

// Full session shape returned by GET /api/sessions/[id]
const SessionRawSchema = SessionSummarySchema.extend({
  messages: z.array(z.object({ role: z.string(), content: z.string(), citations: z.unknown().optional() })).optional(),
});

function toSession(raw: z.infer<typeof SessionRawSchema>): ChatSession {
  return {
    id: raw.id,
    title: raw.title,
    createdAt: new Date(raw.createdAt as string | Date).getTime(),
    updatedAt: new Date(raw.updatedAt as string | Date).getTime(),
    messages: (raw.messages ?? []).map((m) => {
      const parsed = MessageSchema.safeParse({
        role: m.role,
        content: m.content,
        citations: Array.isArray(m.citations) ? m.citations : undefined,
      });
      return parsed.success ? parsed.data : { role: m.role as "user" | "assistant", content: m.content };
    }),
  };
}

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
