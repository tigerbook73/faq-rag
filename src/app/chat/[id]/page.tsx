import { ChatWindow } from "@/components/chat/ChatWindow";
import { prisma } from "@/lib/db/client";
import type { ChatSession, Message } from "@/lib/session-api";
import type { Citation } from "@/components/chat/CitationDrawer";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const raw = user
    ? await prisma.session.findFirst({
        where: { id, userId: user.id },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      })
    : null;

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
