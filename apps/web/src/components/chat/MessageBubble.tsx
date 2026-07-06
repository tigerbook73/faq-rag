"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Citation } from "@/lib/shared/schemas/session";

interface Props {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  onCitationClick?: (c: Citation) => void;
  isLoading?: boolean;
}

// Remove inline citation markers ([^n], (^n), [n]) before rendering. The
// system prompt no longer asks for them, but stored messages from before the
// prompt change still contain them. [n] is only stripped when n matches a
// known citation id, so plain text like arr[0] survives.
function stripCitationMarks(content: string, citations?: Citation[]): string {
  const ids = new Set(citations?.map((c) => c.id) ?? []);
  return content
    .replace(/ ?\[\^(\d+)\]/g, "")
    .replace(/ ?\(\^(\d+)\)/g, "")
    .replace(/ ?\[(\d+)\]/g, (match, n) => (ids.has(parseInt(n, 10)) ? "" : match));
}

export function MessageBubble({ role, content, citations, onCitationClick, isLoading }: Props) {
  const isUser = role === "user";

  return (
    <div data-role={role} className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[90%] overflow-hidden rounded-2xl px-4 py-3 text-sm sm:max-w-[80%] ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : isLoading && !content ? (
          <TypingDots />
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{stripCitationMarks(content, citations)}</ReactMarkdown>
            {citations && citations.length > 0 && (
              <CitationList citations={citations} onCitationClick={onCitationClick} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CitationList({
  citations,
  onCitationClick,
}: {
  citations: Citation[];
  onCitationClick?: (c: Citation) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="not-prose mt-3 border-t pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 text-xs"
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        引用来源 ({citations.length})
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {citations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onCitationClick?.(c)}
              className="bg-background hover:bg-accent block w-full cursor-pointer rounded-lg border p-3 text-left text-xs"
            >
              <p className="text-muted-foreground mb-1 font-medium">
                [{c.id}] {c.documentName}
                <span className="ml-2 opacity-60">{(c.score * 100).toFixed(0)}% 相似</span>
              </p>
              <p className="text-foreground/80 line-clamp-3">{c.preview}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-0.5">
      <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-current" />
    </div>
  );
}
