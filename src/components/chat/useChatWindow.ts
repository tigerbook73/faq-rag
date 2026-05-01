"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback, type Dispatch, type SetStateAction } from "react";
import { type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { upsertSession, type Message, type ChatSession } from "@/lib/session-api";
import { lastChat } from "@/lib/last-chat";
import { STORAGE_KEYS, CHAT_EVENTS } from "@/lib/constants";
import { createParser } from "eventsource-parser";
import { toast } from "sonner";
import type { Citation } from "./CitationDrawer";

// ── Draft persistence ──────────────────────────────────────────────────────────
// Manages the textarea input value and its localStorage draft backup.

export function useDraftPersistence(chatId: string | null) {
  const draftKey = STORAGE_KEYS.DRAFT(chatId ?? "new");
  const readDraft = (key: string) => (typeof window !== "undefined" ? (localStorage.getItem(key) ?? "") : "");
  const [input, setInput] = useState(() => readDraft(draftKey));
  const [prevDraftKey, setPrevDraftKey] = useState(draftKey);

  // Sync input when the chat changes (key changes on navigation to a different session)
  if (prevDraftKey !== draftKey) {
    setPrevDraftKey(draftKey);
    setInput(readDraft(draftKey));
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (input) localStorage.setItem(draftKey, input);
      else localStorage.removeItem(draftKey);
    }, 300);
    return () => clearTimeout(timer);
  }, [input, draftKey]);

  return { input, setInput, draftKey };
}

// ── Chat scroll behaviour ──────────────────────────────────────────────────────
// Restores saved scroll position on mount, saves it on unmount, and scrolls to
// the bottom whenever new messages are appended.

export function useChatScroll(messages: Message[], chatId: string | null, initialCount: number) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(initialCount);

  // Restore scroll position before first paint; fall back to bottom
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

  // Scroll to bottom only when new messages are added
  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCount.current = messages.length;
  }, [messages]);

  return { bottomRef, scrollContainerRef };
}

// ── Streaming chat ─────────────────────────────────────────────────────────────
// Owns the SSE stream lifecycle, loading state, textarea ref, and session
// persistence after each response.

interface UseStreamingChatParams {
  chatId: string | null;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  session: ChatSession | null;
  setSession: Dispatch<SetStateAction<ChatSession | null>>;
  provider: string;
  router: AppRouterInstance;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  draftKey: string;
}

export function useStreamingChat({
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
}: UseStreamingChatParams) {
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!loading) textareaRef.current?.focus();
  }, [loading]);

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
      const next: ChatSession = { ...s, id: idToUse, title, messages: updated, updatedAt: now };
      setSession(next);
      lastChat.set(idToUse);
      await upsertSession(next);
      window.dispatchEvent(new CustomEvent(CHAT_EVENTS.SESSION_UPDATED));
    },
    [setSession],
  );

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
          let payload: { type: string; citations?: Citation[]; token?: string; answer?: string };
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
              updated[assistantIndex] = { ...updated[assistantIndex], content: assistantContent };
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
            doneMessages = [
              ...withUser,
              { role: "assistant", content: finalContent, citations: citations.filter((c) => usedNums.has(c.id)) },
            ];
            setMessages(doneMessages);
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
  }, [input, loading, messages, provider, session, chatId, router, persistMessages, draftKey, setInput, setMessages]);

  return { loading, send, textareaRef };
}
