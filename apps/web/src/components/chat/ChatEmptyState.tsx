"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/client/swr";
import { type SampleQuestionItem } from "@faq-rag/shared";

function sampleQuestions(pool: string[], count: number): string[] {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

interface ChatEmptyStateProps {
  onSend: (question: string) => void;
}

export function ChatEmptyState({ onSend }: ChatEmptyStateProps) {
  const { data } = useSWR<{ items: SampleQuestionItem[] }>("/api/sample-questions", fetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
  });

  const pool = useMemo(() => data?.items.map((q) => q.question) ?? [], [data]);

  // The pool is available during SSR (via SWRBootstrap's fallback), but shuffling
  // with Math.random() during render would pick a different order on the server
  // than on the client's first hydration pass, causing a hydration mismatch.
  // Deferring the shuffle until after mount keeps the first paint identical on both sides.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Intentional: flips once after the hydration-matching first paint so the
    // client-only shuffle below only runs post-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  const questions = useMemo(() => (mounted ? sampleQuestions(pool, 4) : []), [mounted, pool]);

  const cols = [questions.slice(0, 2), questions.slice(2)];

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-4">
      <p className="text-muted-foreground text-sm">Ask a question about your knowledge base</p>

      {questions.length > 0 && (
        <div className="w-full">
          <p className="text-muted-foreground mb-2 text-sm">Try asking:</p>
          <div className="flex w-full gap-2">
            {cols.map((col, ci) => (
              <div key={ci} className="flex flex-1 flex-col gap-2">
                {col.map((q) => (
                  <button
                    key={q}
                    onClick={() => onSend(q)}
                    className="bg-background hover:bg-muted w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
