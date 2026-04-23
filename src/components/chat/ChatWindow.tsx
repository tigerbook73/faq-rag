"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ProviderSelect } from "./ProviderSelect";
import { MessageBubble } from "./MessageBubble";
import { CitationDrawer, type Citation } from "./CitationDrawer";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PROVIDER, type Provider } from "@/src/lib/llm/providers";
import {
  getSession,
  saveSession,
  setLastChatId,
  type Message,
  type ChatSession,
} from "@/src/lib/chat-storage";

export function ChatWindow({ chatId }: { chatId: string | null }) {
  const router = useRouter();
  const [provider, setProvider] = useState<Provider>(PROVIDER.DEEPSEEK);
  const [session, setSession] = useState<ChatSession | null>(() =>
    chatId ? getSession(chatId) : null,
  );
  const [messages, setMessages] = useState<Message[]>(() =>
    chatId ? (getSession(chatId)?.messages ?? []) : [],
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Redirect to new chat if the ID is not found in storage
  useEffect(() => {
    if (chatId && !getSession(chatId)) {
      router.replace("/chat/new");
    }
  }, [chatId, router]);

  // Sync last-visited pointer when loading an existing session
  useEffect(() => {
    if (session) setLastChatId(session.id);
  }, [session]);

  const persistMessages = useCallback(
    (updated: Message[], currentSession: ChatSession | null, idToUse: string) => {
      const now = Date.now();
      const s: ChatSession = currentSession ?? {
        id: idToUse,
        title: "New Chat",
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
      const title =
        s.title === "New Chat"
          ? (updated.find((m) => m.role === "user")?.content.slice(0, 60) ?? "New Chat")
          : s.title;
      const next: ChatSession = { ...s, id: idToUse, title, messages: updated, updatedAt: now };
      setSession(next);
      saveSession(next);
      setLastChatId(idToUse);
      window.dispatchEvent(new CustomEvent("chat-session-updated"));
    },
    [],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!loading) textareaRef.current?.focus();
  }, [loading]);

  const handleCitationClick = useCallback((c: Citation) => {
    setSelectedCitation(c);
    setDrawerOpen(true);
  }, []);

  const send = useCallback(async () => {
    textareaRef.current?.focus();

    const question = input.trim();
    if (!question || loading) return;

    setInput("");
    setLoading(true);

    // Resolve or generate the chat ID at send time
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
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = JSON.parse(line.slice(6));

          if (payload.type === "citations") {
            citations = payload.citations;
          } else if (payload.type === "token") {
            assistantContent += payload.token;
            setMessages((prev) => {
              const updated = [...prev];
              updated[assistantIndex] = { ...updated[assistantIndex], content: assistantContent };
              return updated;
            });
          } else if (payload.type === "done") {
            const usedNums = new Set(
              [...assistantContent.matchAll(/\[\^(\d+)\]/g)].map((m) => parseInt(m[1], 10)),
            );
            const usedCitations = citations.filter((c) => usedNums.has(c.id));
            const finalMessages: Message[] = [
              ...withUser,
              { role: "assistant", content: assistantContent, citations: usedCitations },
            ];
            setMessages(finalMessages);
            if (!chatId) router.replace(`/chat/${resolvedId}`);
            persistMessages(finalMessages, sessionAtSend, resolvedId);
          }
        }
      }
    } catch (err) {
      const finalMessages: Message[] = [
        ...withUser,
        { role: "assistant", content: `Error: ${String(err)}` },
      ];
      setMessages(finalMessages);
      if (!chatId) router.replace(`/chat/${resolvedId}`);
      persistMessages(finalMessages, sessionAtSend, resolvedId);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, provider, session, chatId, router, persistMessages]);

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
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 py-3 border-b pl-12">
        <h1 className="font-semibold text-lg truncate max-w-xs">{session?.title ?? "New Chat"}</h1>
        <div className="flex items-center gap-3">
          <span>Provider:</span>
          <ProviderSelect value={provider} onChange={setProvider} />
          <Link href="/knowledge">Knowledge Base</Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Ask a question about your knowledge base
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble
            key={i}
            role={m.role}
            content={m.content}
            citations={m.citations}
            onCitationClick={handleCitationClick}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question... (Ctrl+Enter to send)"
          className="flex-1 resize-none min-h-15 max-h-50"
          rows={2}
          disabled={loading}
        />
        <Button onClick={send} disabled={loading} className="h-15 px-6">
          {loading ? "Thinking…" : "Send"}
        </Button>
      </div>

      <CitationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} citation={selectedCitation} />
    </div>
  );
}
