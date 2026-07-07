import { z } from "zod";
import {
  CreateSessionInputSchema,
  UpdateSessionInputSchema,
  SessionRawSchema,
  toSession,
  type Message,
  type Citation,
  type CreateSessionInput,
  type UpdateSessionInput,
  type ChatSession,
} from "@faq-rag/shared";
import { getApiUrl } from "./config";

export type { Message, Citation, ChatSession };

export async function listSessions(): Promise<ChatSession[]> {
  const res = await fetch(`${getApiUrl()}/api/sessions`);
  if (!res.ok) throw new Error(`Failed to list sessions: ${res.status}`);
  const data = z.array(SessionRawSchema).parse(await res.json());
  return data.map(toSession);
}

export async function getSession(id: string): Promise<ChatSession | null> {
  const res = await fetch(`${getApiUrl()}/api/sessions/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to get session: ${res.status}`);
  return toSession(SessionRawSchema.parse(await res.json()));
}

export async function createSession(input: CreateSessionInput): Promise<ChatSession> {
  const res = await fetch(`${getApiUrl()}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(CreateSessionInputSchema.parse(input)),
  });
  if (!res.ok) throw new Error(`Failed to create session: ${res.status}`);
  return toSession(SessionRawSchema.parse(await res.json()));
}

export async function updateSession(id: string, input: UpdateSessionInput): Promise<ChatSession> {
  const res = await fetch(`${getApiUrl()}/api/sessions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(UpdateSessionInputSchema.parse(input)),
  });
  if (!res.ok) throw new Error(`Failed to update session: ${res.status}`);
  return toSession(SessionRawSchema.parse(await res.json()));
}

export async function deleteSession(id: string): Promise<void> {
  const res = await fetch(`${getApiUrl()}/api/sessions/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`Failed to delete session: ${res.status}`);
}
