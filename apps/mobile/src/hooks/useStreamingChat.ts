import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { mutate as swrMutate } from "swr";
import type { Message, Citation } from "@faq-rag/shared";
import { streamChat, type Provider } from "../lib/api/chat";
import { updateSession, type ChatSession } from "../lib/api/session";
import { setLastChat } from "../lib/api/storage";

const INTERRUPTED_MARK = "\n\n⚠️ _回答被中断_";

interface Params {
  chatId: string;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  session: ChatSession | null;
  setSession: Dispatch<SetStateAction<ChatSession | null>>;
  provider: Provider;
}

// Mobile port of apps/web/src/components/chat/useChatWindow.ts's
// useStreamingChat: optimistic user message, SSE token streaming, and PATCH
// persistence after each turn.
export function useStreamingChat({ chatId, messages, setMessages, session, setSession, provider }: Params) {
  const [loading, setLoading] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  const persistMessages = useCallback(
    async (updated: Message[], currentSession: ChatSession | null) => {
      const question = updated.find((m) => m.role === "user")?.content ?? "";
      const title =
        currentSession && currentSession.title !== "New Chat"
          ? currentSession.title
          : question.slice(0, 30) || "New Chat";
      try {
        const next = await updateSession(chatId, {
          title,
          messages: updated.map((m) => ({ role: m.role, content: m.content, citations: m.citations })),
        });
        // PATCH response omits nothing, but keep local messages authoritative
        // (server echoes what we sent; avoids a race with in-flight renders).
        const merged: ChatSession = { ...next, messages: updated };
        setSession(merged);
        void setLastChat(chatId);
        void swrMutate("/api/sessions");
        void swrMutate(`/api/sessions/${chatId}`, merged, { revalidate: false });
      } catch {
        // Persistence failure must not clobber the visible conversation; the
        // next successful turn will re-send the full message list anyway.
      }
    },
    [chatId, setSession],
  );

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || loading) return;

      setLoading(true);

      const withUser: Message[] = [...messages, { role: "user", content: question }];
      const assistantIndex = withUser.length;
      setMessages([...withUser, { role: "assistant", content: "" }]);

      const sessionAtSend = session;
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      let assistantContent = "";
      let citations: Citation[] = [];
      let settled = false;
      let flushTimer: ReturnType<typeof setTimeout> | null = null;

      // Coalesces per-token updates: flushing at most every 50ms keeps the
      // full-string markdown re-parse cost linear instead of quadratic.
      const flushTokens = () => {
        flushTimer = null;
        setMessages((prev) => {
          const updated = [...prev];
          updated[assistantIndex] = { ...updated[assistantIndex], content: assistantContent };
          return updated;
        });
      };

      const finish = (finalMessages: Message[]) => {
        if (settled) return;
        settled = true;
        if (flushTimer) {
          clearTimeout(flushTimer);
          flushTimer = null;
        }
        setMessages(finalMessages);
        setLoading(false);
        void persistMessages(finalMessages, sessionAtSend);
      };

      controllerRef.current = streamChat(
        { question, provider, history },
        {
          onCitations: (c) => {
            citations = c;
          },
          onToken: (token) => {
            assistantContent += token;
            if (!flushTimer) flushTimer = setTimeout(flushTokens, 50);
          },
          onDone: (answer, doneCitations) => {
            const finalContent = answer || assistantContent;
            // Prefer the server-filtered list (only citations the answer uses);
            // fall back to the full retrieved list from the initial event.
            finish([...withUser, { role: "assistant", content: finalContent, citations: doneCitations ?? citations }]);
          },
          onError: (message) => {
            const content = assistantContent ? assistantContent + INTERRUPTED_MARK : `⚠️ ${message}`;
            finish([...withUser, { role: "assistant", content }]);
          },
          onClose: () => {
            // Stream ended without a "done" event (e.g. server crash mid-answer).
            if (settled) return;
            if (assistantContent) {
              finish([...withUser, { role: "assistant", content: assistantContent + INTERRUPTED_MARK }]);
            } else {
              finish([...withUser, { role: "assistant", content: "⚠️ 回答被中断" }]);
            }
          },
        },
      );
    },
    [loading, messages, session, provider, setMessages, persistMessages],
  );

  return { loading, send };
}
