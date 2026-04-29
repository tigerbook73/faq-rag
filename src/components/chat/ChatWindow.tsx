"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MessageBubble } from "./MessageBubble";
import { CitationDrawer, type Citation } from "./CitationDrawer";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { setLastChatId, type Message, type ChatSession } from "@/lib/chat-storage";
import { CHAT_EVENTS } from "@/lib/constants";
import { usePageTitle } from "@/context/page-title-context";
import { useProvider } from "@/context/provider-context";
import { useDraftPersistence, useChatScroll, useStreamingChat } from "./useChatWindow";

export function ChatWindow({ chatId, initialSession }: { chatId: string | null; initialSession: ChatSession | null }) {
  const router = useRouter();
  const { provider } = useProvider();
  const { setSubtitle } = usePageTitle();
  const [session, setSession] = useState<ChatSession | null>(initialSession);
  const [messages, setMessages] = useState<Message[]>(initialSession?.messages ?? []);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { input, setInput, draftKey } = useDraftPersistence(chatId);
  const { bottomRef, scrollContainerRef } = useChatScroll(messages, chatId, initialSession?.messages?.length ?? 0);
  const { loading, send, textareaRef } = useStreamingChat({
    chatId,
    messages,
    setMessages,
    session,
    setSession,
    provider,
    router,
    input,
    setInput,
    draftKey,
  });

  useEffect(() => {
    if (!chatId) return;
    if (!initialSession) {
      router.replace("/chat/new");
      return;
    }
    setLastChatId(chatId);
    window.dispatchEvent(new CustomEvent(CHAT_EVENTS.LAST_CHANGED));
  }, [chatId, initialSession, router]);

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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-4">
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
        <div className="mx-auto flex w-full max-w-3xl items-end gap-2 px-4 py-3">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question… (Ctrl+Enter / ⌘+Enter to send)"
            className="max-h-50 min-h-15 flex-1 resize-none"
            rows={2}
            disabled={loading}
          />
          <Button onClick={send} disabled={loading} className="h-15 px-6">
            {loading ? "Thinking…" : "Send"}
          </Button>
        </div>
      </div>

      <CitationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} citation={selectedCitation} />
    </div>
  );
}
