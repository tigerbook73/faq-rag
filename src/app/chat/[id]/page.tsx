import { ChatWindow } from "@/src/components/chat/ChatWindow";
import { prisma } from "@/src/lib/db/client";
import type { ChatSession, Message } from "@/src/lib/chat-storage";
import type { Citation } from "@/src/components/chat/CitationDrawer";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const raw = await prisma.session.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

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
