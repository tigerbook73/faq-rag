"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ProviderSelect } from "./ProviderSelect";
import { MessageBubble } from "./MessageBubble";
import { CitationDrawer, type Citation } from "./CitationDrawer";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { PROVIDER, type Provider } from "@/src/lib/llm/providers";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

export function ChatWindow() {
  const [provider, setProvider] = useState<Provider>(PROVIDER.DEEPSEEK);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    const question = input.trim();
    if (!question || loading) return;

    setInput("");
    setLoading(true);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: question }]);

    let assistantContent = "";
    let citations: Citation[] = [];
    const assistantIndex = messages.length + 1;

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

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
            setMessages((prev) => {
              const updated = [...prev];
              updated[assistantIndex] = {
                ...updated[assistantIndex],
                citations,
              };
              return updated;
            });
          } else if (payload.type === "token") {
            assistantContent += payload.token;
            setMessages((prev) => {
              const updated = [...prev];
              updated[assistantIndex] = {
                ...updated[assistantIndex],
                content: assistantContent,
                citations,
              };
              return updated;
            });
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantIndex] = {
          role: "assistant",
          content: `Error: ${String(err)}`,
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, provider]);

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
    <div className="flex h-screen justify-center items-center">
      <div className="flex flex-col h-full w-[80%] max-w-3xl border border-black">
        <header className="flex items-center justify-between px-4 py-3 border-b">
          <h1 className="font-semibold text-lg">FAQ RAG</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Provider:</span>
            <ProviderSelect value={provider} onChange={setProvider} />
            <Link href="/knowledge" className="text-sm text-primary hover:underline">
              Knowledge Base
            </Link>
          </div>
        </header>

        <ScrollArea className="flex-1 px-4 py-4">
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
        </ScrollArea>

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
          <Button onClick={send} disabled={loading || !input.trim()} className="h-15 px-6">
            {loading ? "Thinking…" : "Send"}
          </Button>
        </div>

        <CitationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} citation={selectedCitation} />
      </div>
    </div>
  );
}
