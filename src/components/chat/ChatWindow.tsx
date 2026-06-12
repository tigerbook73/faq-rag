"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { MessageBubble } from "./MessageBubble";
import { CitationDrawer } from "./CitationDrawer";
import { type Citation } from "@/lib/shared/schemas/session";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { type Message, type ChatSession, fetchSession } from "@/lib/client/session-api";
import { lastChat } from "@/lib/client/last-chat";
import { usePageTitle } from "@/context/page-title-context";
import { useProvider } from "@/context/provider-context";
import { Skeleton } from "@/components/ui/skeleton";
import { useDraftPersistence, useChatScroll, useStreamingChat } from "./useChatWindow";

export function ChatWindow({ chatId }: { chatId: string | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { provider } = useProvider();
  const { setSubtitle } = usePageTitle();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: sessionData, isLoading: isSessionLoading } = useSWR<ChatSession | null>(
    chatId ? `/api/sessions/${chatId}` : null,
    (url) => fetchSession(url.split("/").pop()!),
    { revalidateOnFocus: false, revalidateOnReconnect: false, revalidateIfStale: false },
  );

  const { input, setInput, draftKey } = useDraftPersistence(chatId);
  const { bottomRef, scrollContainerRef } = useChatScroll(messages, chatId, messages.length);
  const { loading, send, textareaRef } = useStreamingChat({
    chatId,
    messages,
    setMessages,
    session,
    setSession,
    provider,
    input,
    setInput,
    draftKey,
  });

  useEffect(() => {
    if (isSessionLoading) return;
    if (sessionData === null) {
      router.replace("/chat/new");
      return;
    }
    if (!sessionData) return;
    startTransition(() => {
      setSession(sessionData);
      setMessages(sessionData.messages);
    });
    if (chatId) lastChat.set(chatId);
  }, [chatId, sessionData, isSessionLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSubtitle(session?.title ?? "New Chat");
    return () => setSubtitle(null);
  }, [session?.title, setSubtitle]);

  const handleCitationClick = useCallback((c: Citation) => {
    setSelectedCitation(c);
    setDrawerOpen(true);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        send();
      }
    },
    [send],
  );

  if (isSessionLoading || isPending) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-(--container-app-chat) space-y-6 px-4 py-4">
            <div className="flex justify-end">
              <Skeleton className="h-10 w-48 rounded-2xl" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-10 w-36 rounded-2xl" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-(--container-app-chat) px-4 py-4">
          {messages.length === 0 && (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              Ask a question about your knowledge base
            </div>
          )}
          {messages.map((m, i) => (
            <MessageBubble
              key={i}
              role={m.role}
              content={m.content}
              isLoading={loading && i === messages.length - 1 && m.role === "assistant"}
              citations={m.citations}
              onCitationClick={handleCitationClick}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t">
        <div className="mx-auto flex w-full max-w-(--container-app-chat) items-end gap-2 px-4 py-3">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question… (Ctrl+Enter / ⌘+Enter to send)"
            className="min-h-app-composer max-h-50 flex-1 resize-none"
            rows={2}
            disabled={loading}
          />
          <Button onClick={send} disabled={loading} className="h-app-composer px-6">
            {loading ? "Thinking…" : "Send"}
          </Button>
        </div>
      </div>

      <CitationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} citation={selectedCitation} />
    </div>
  );
}
