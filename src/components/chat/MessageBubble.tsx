"use client";

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import { Button } from "@/components/ui/button";
import type { Citation } from "./CitationDrawer";

interface Props {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  onCitationClick?: (c: Citation) => void;
  isLoading?: boolean;
}

export function MessageBubble({ role, content, citations, onCitationClick, isLoading }: Props) {
  const isUser = role === "user";

  const rendered = content.replace(/\[(\d+)\]/g, (_, n) => `[^${parseInt(n, 10)}]`);

  return (
    <div data-role={role} className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[90%] sm:max-w-[80%] overflow-hidden rounded-2xl px-4 py-3 text-sm ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : isLoading && !content ? (
          <TypingDots />
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              rehypePlugins={[rehypeHighlight]}
              components={{
                // render [^n] as clickable superscripts
                p({ children }) {
                  const nodes = Array.isArray(children) ? children : [children];
                  const processed = nodes.flatMap((node, nodeIndex) =>
                    typeof node === "string"
                      ? renderWithCitations(node, citations, onCitationClick, nodeIndex)
                      : [node],
                  );
                  return <p>{processed}</p>;
                },
              }}
            >
              {rendered}
            </ReactMarkdown>
            {citations && citations.length > 0 && (
              <div className="mt-3 border-t pt-2 space-y-1">
                {citations.map((c) => (
                  <Button
                    key={c.id}
                    variant="ghost"
                    size="sm"
                    className="h-auto w-full justify-start text-xs text-muted-foreground font-normal px-2 py-0.5"
                    onClick={() => onCitationClick?.(c)}
                  >
                    <span className="truncate">
                      [{c.id}] {c.documentName} — {c.preview.slice(0, 60)}…
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-0.5">
      <span className="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
      <span className="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
      <span className="h-2 w-2 rounded-full bg-current animate-bounce" />
    </div>
  );
}

function renderWithCitations(
  text: string,
  citations: Citation[] | undefined,
  onClick?: (c: Citation) => void,
  nodeIndex = 0,
) {
  if (!citations) return [text];
  const parts = text.split(/(\[\^\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/\[\^(\d+)\]/);
    if (match) {
      const num = parseInt(match[1], 10);
      const citation = citations.find((c) => c.id === num);
      if (citation) {
        return (
          <sup key={`${nodeIndex}-${i}`}>
            <button className="text-primary underline cursor-pointer" onClick={() => onClick?.(citation)}>
              [{num}]
            </button>
          </sup>
        );
      }
    }
    return part;
  });
}
