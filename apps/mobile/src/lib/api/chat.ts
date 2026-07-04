import { createParser } from "eventsource-parser";
import type { ChatRequestInput, Citation } from "@faq-rag/shared";
import { getApiUrl } from "./config";

export type Provider = ChatRequestInput["provider"];

export interface StreamChatCallbacks {
  onCitations?: (citations: Citation[]) => void;
  onToken?: (token: string) => void;
  onDone?: (answer: string) => void;
  onError?: (message: string) => void;
  /** Fires when the stream closes cleanly, whether or not "done" was received. */
  onClose?: () => void;
}

interface ChatEventPayload {
  type: "citations" | "token" | "done" | "error";
  citations?: Citation[];
  token?: string;
  answer?: string;
  message?: string;
}

/**
 * Starts a POST /api/chat SSE stream and dispatches parsed events to callbacks.
 * Returns an AbortController the caller can use to cancel the in-flight request.
 */
export function streamChat(params: ChatRequestInput, callbacks: StreamChatCallbacks): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        callbacks.onError?.(`Chat request failed (${res.status})`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const parser = createParser({
        onEvent: (event) => {
          let payload: ChatEventPayload;
          try {
            payload = JSON.parse(event.data);
          } catch {
            return;
          }
          if (payload.type === "citations") callbacks.onCitations?.(payload.citations ?? []);
          else if (payload.type === "token") callbacks.onToken?.(payload.token ?? "");
          else if (payload.type === "done") callbacks.onDone?.(payload.answer ?? "");
          else if (payload.type === "error") callbacks.onError?.(payload.message ?? "Unknown error");
        },
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.feed(decoder.decode(value, { stream: true }));
      }
      callbacks.onClose?.();
    } catch (err) {
      if (controller.signal.aborted) return;
      callbacks.onError?.(err instanceof Error ? err.message : String(err));
    }
  })();

  return controller;
}
