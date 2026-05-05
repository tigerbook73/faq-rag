import { ChatWindow } from "@/components/chat/ChatWindow";
import type { ChatSession, Message } from "@/lib/session-api";
import type { Citation } from "@/components/chat/CitationDrawer";
import { requireUser } from "@/lib/auth/require-user";
import { getSessionForUser } from "@/lib/data/sessions";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireUser();

  const raw = await getSessionForUser(actor.id, id);

  const initialSession: ChatSession | null = raw
    ? {
        id: raw.id,
        title: raw.title,
        createdAt: raw.createdAt.getTime(),
        updatedAt: raw.updatedAt.getTime(),
        messages: raw.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          citations: (m.citations as Citation[] | null) ?? undefined,
        })) satisfies Message[],
      }
    : null;

  return <ChatWindow key={id} chatId={id} initialSession={initialSession} />;
}
