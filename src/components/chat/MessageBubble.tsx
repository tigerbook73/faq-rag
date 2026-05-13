"use client";

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import { Button } from "@/components/ui/button";
import type { Citation } from "@/lib/shared/schemas/session";

interface Props {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  onCitationClick?: (c: Citation) => void;
  isLoading?: boolean;
}

export function MessageBubble({ role, content, citations, onCitationClick, isLoading }: Props) {
  const isUser = role === "user";

  // Normalise all citation variants ([^n], [n], (^n)) to @@n@@ before passing to
  // ReactMarkdown so remark doesn't parse [^n] as a footnote linkReference node.
  const rendered = content
    .replace(/\[\^(\d+)\]/g, (_, n) => `@@${parseInt(n, 10)}@@`)
    .replace(/\[(\d+)\]/g, (_, n) => `@@${parseInt(n, 10)}@@`)
    .replace(/\(\^(\d+)\)/g, (_, n) => `@@${parseInt(n, 10)}@@`);

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
                li({ children }) {
                  const nodes = Array.isArray(children) ? children : [children];
                  const processed = nodes.flatMap((node, nodeIndex) =>
                    typeof node === "string"
                      ? renderWithCitations(node, citations, onCitationClick, nodeIndex)
                      : [node],
                  );
                  return <li>{processed}</li>;
                },
              }}
            >
              {rendered}
            </ReactMarkdown>
            {citations && citations.length > 0 && (
              <div className="mt-3 space-y-1 border-t pt-2">
                {citations.map((c) => (
                  <Button
                    key={c.id}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground h-auto w-full justify-start px-2 py-0.5 text-xs font-normal"
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
      <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-current" />
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
  const parts = text.split(/(@@\d+@@)/g);
  return parts.map((part, i) => {
    const match = part.match(/@@(\d+)@@/);
    if (match) {
      const num = parseInt(match[1], 10);
      const citation = citations.find((c) => c.id === num);
      if (citation) {
        return (
          <sup key={`${nodeIndex}-${i}`}>
            <button className="text-primary cursor-pointer underline" onClick={() => onClick?.(citation)}>
              [{num}]
            </button>
          </sup>
        );
      }
    }
    return part;
  });
}
