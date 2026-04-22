"use client";

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import type { Citation } from "./CitationDrawer";

interface Props {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  onCitationClick?: (c: Citation) => void;
}

export function MessageBubble({ role, content, citations, onCitationClick }: Props) {
  const isUser = role === "user";

  const rendered = content.replace(/\[\^(\d+)\]/g, (_, n) => {
    const num = parseInt(n, 10);
    return `[^${num}]`;
  });

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              rehypePlugins={[rehypeHighlight]}
              components={{
                // render [^n] as clickable superscripts
                p({ children }) {
                  return <p>{renderWithCitations(String(children), citations, onCitationClick)}</p>;
                },
              }}
            >
              {rendered}
            </ReactMarkdown>
            {citations && citations.length > 0 && (
              <div className="mt-3 border-t pt-2 space-y-1">
                {citations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onCitationClick?.(c)}
                    className="block text-xs text-muted-foreground hover:text-foreground text-left"
                  >
                    [^{c.id}] {c.documentName} — {c.preview.slice(0, 60)}…
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function renderWithCitations(text: string, citations: Citation[] | undefined, onClick?: (c: Citation) => void) {
  if (!citations) return text;
  const parts = text.split(/(\[\^\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/\[\^(\d+)\]/);
    if (match) {
      const num = parseInt(match[1], 10);
      const citation = citations.find((c) => c.id === num);
      if (citation) {
        return (
          <sup key={i}>
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
