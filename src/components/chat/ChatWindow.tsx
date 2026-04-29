"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MessageBubble } from "./MessageBubble";
import { CitationDrawer, type Citation } from "./CitationDrawer";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { setLastChatId, upsertSession, type Message, type ChatSession } from "@/lib/chat-storage";
import { STORAGE_KEYS, CHAT_EVENTS } from "@/lib/constants";
import { createParser } from "eventsource-parser";
import { toast } from "sonner";
import { usePageTitle } from "@/context/page-title-context";
import { useProvider } from "@/context/provider-context";

export function ChatWindow({ chatId, initialSession }: { chatId: string | null; initialSession: ChatSession | null }) {
  const router = useRouter();
  const { provider } = useProvider();
  const { setSubtitle } = usePageTitle();
  const [session, setSession] = useState<ChatSession | null>(initialSession);
  const [messages, setMessages] = useState<Message[]>(initialSession?.messages ?? []);
  const draftKey = STORAGE_KEYS.DRAFT(chatId ?? "new");
  const readDraft = (key: string) => (typeof window !== "undefined" ? (localStorage.getItem(key) ?? "") : "");
  const [input, setInput] = useState(() => readDraft(draftKey));
  const [prevDraftKey, setPrevDraftKey] = useState(draftKey);
  if (prevDraftKey !== draftKey) {
    setPrevDraftKey(draftKey);
    setInput(readDraft(draftKey));
  }
  const [loading, setLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevMessageCount = useRef(initialSession?.messages?.length ?? 0);

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

  const persistMessages = useCallback(
    async (updated: Message[], currentSession: ChatSession | null, idToUse: string) => {
      const now = Date.now();
      const s: ChatSession = currentSession ?? {
        id: idToUse,
        title: "New Chat",
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
      const title =
        s.title === "New Chat" ? (updated.find((m) => m.role === "user")?.content.slice(0, 60) ?? "New Chat") : s.title;
      const next: ChatSession = {
        ...s,
        id: idToUse,
        title,
        messages: updated,
        updatedAt: now,
      };
      setSession(next);
      setLastChatId(idToUse);
      await upsertSession(next);
      window.dispatchEvent(new CustomEvent(CHAT_EVENTS.SESSION_UPDATED));
    },
    [],
  );

  // Restore saved scroll position before first paint; fall back to bottom
  useLayoutEffect(() => {
    const saved = chatId ? sessionStorage.getItem(STORAGE_KEYS.SCROLL(chatId)) : null;
    if (saved && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = parseInt(saved);
    } else {
      bottomRef.current?.scrollIntoView();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save scroll position on unmount (only for existing sessions)
  useEffect(() => {
    const el = scrollContainerRef.current;
    return () => {
      if (chatId && el) {
        sessionStorage.setItem(STORAGE_KEYS.SCROLL(chatId), String(el.scrollTop));
      }
    };
  }, [chatId]);

  // Scroll to bottom only when new messages are added (not on initial render)
  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCount.current = messages.length;
  }, [messages]);

  useEffect(() => {
    if (!loading) textareaRef.current?.focus();
  }, [loading]);

  // Persist draft with debounce — clears key when input is empty
  useEffect(() => {
    const timer = setTimeout(() => {
      if (input) localStorage.setItem(draftKey, input);
      else localStorage.removeItem(draftKey);
    }, 300);
    return () => clearTimeout(timer);
  }, [input, draftKey]);

  const handleCitationClick = useCallback((c: Citation) => {
    setSelectedCitation(c);
    setDrawerOpen(true);
  }, []);

  const send = useCallback(async () => {
    textareaRef.current?.focus();

    const question = input.trim();
    if (!question || loading) return;

    setInput("");
    localStorage.removeItem(draftKey);
    setLoading(true);

    const resolvedId = chatId ?? crypto.randomUUID();

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const withUser: Message[] = [...messages, { role: "user", content: question }];
    setMessages(withUser);

    let assistantContent = "";
    let citations: Citation[] = [];
    const assistantIndex = withUser.length;

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const sessionAtSend = session;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, provider, history }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let streamDone = false;
      let doneMessages: Message[] | null = null;

      const parser = createParser({
        onEvent: (event) => {
          const raw = event.data;
          let payload: {
            type: string;
            citations?: Citation[];
            token?: string;
            answer?: string;
          };
          try {
            payload = JSON.parse(raw);
          } catch {
            return;
          }

          if (payload.type === "citations") {
            citations = payload.citations ?? [];
          } else if (payload.type === "token") {
            assistantContent += payload.token ?? "";
            setMessages((prev) => {
              const updated = [...prev];
              updated[assistantIndex] = {
                ...updated[assistantIndex],
                content: assistantContent,
              };
              return updated;
            });
          } else if (payload.type === "done") {
            streamDone = true;
            const finalContent = payload.answer ?? assistantContent;
            const usedNums = new Set([
              ...[...finalContent.matchAll(/\[\^(\d+)\]/g)].map((m) => parseInt(m[1], 10)),
              ...[...finalContent.matchAll(/\(\^(\d+)\)/g)].map((m) => parseInt(m[1], 10)),
              ...[...finalContent.matchAll(/\[(\d+)\]/g)].map((m) => parseInt(m[1], 10)),
            ]);
            const usedCitations = citations.filter((c) => usedNums.has(c.id));
            doneMessages = [
              ...withUser,
              {
                role: "assistant",
                content: finalContent,
                citations: usedCitations,
              },
            ];
            setMessages(doneMessages);
            // persist + navigate happen after the stream loop so persistMessages is awaited
          }
        },
      });

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          parser.feed(decoder.decode(value, { stream: true }));
        }
      } catch {
        // stream interrupted mid-response — save whatever was generated
        if (assistantContent && !doneMessages) {
          const interrupted = assistantContent + "\n\n⚠️ _回答被中断_";
          const finalMessages: Message[] = [...withUser, { role: "assistant", content: interrupted, citations: [] }];
          setMessages(finalMessages);
          await persistMessages(finalMessages, sessionAtSend, resolvedId);
          if (!chatId) router.replace(`/chat/${resolvedId}`);
          streamDone = true;
        }
      }

      // Normal completion via "done" event — persist then navigate
      if (doneMessages) {
        await persistMessages(doneMessages, sessionAtSend, resolvedId);
        if (!chatId) router.replace(`/chat/${resolvedId}`);
      } else if (!streamDone && assistantContent) {
        // stream ended without "done" event (e.g. server crash) — save partial content
        const partial = assistantContent + "\n\n⚠️ _回答被中断_";
        const finalMessages: Message[] = [...withUser, { role: "assistant", content: partial, citations: [] }];
        setMessages(finalMessages);
        await persistMessages(finalMessages, sessionAtSend, resolvedId);
        if (!chatId) router.replace(`/chat/${resolvedId}`);
      }
    } catch (err) {
      toast.error(String(err));
      setMessages(withUser);
      await persistMessages(withUser, sessionAtSend, resolvedId);
      if (!chatId) router.replace(`/chat/${resolvedId}`);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, provider, session, chatId, router, persistMessages, draftKey]);

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
