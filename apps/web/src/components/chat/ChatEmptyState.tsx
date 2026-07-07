"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/client/swr";
import { type DocumentItem } from "@faq-rag/shared";

const NESTJS_SAMPLE_QUESTIONS = [
  "What are the core building blocks of NestJS?",
  "How does dependency injection work in NestJS?",
  "What is the difference between Guards, Interceptors, and Middleware?",
  "How do I create a REST API with NestJS?",
  "What is the NestJS module system and how do you organize modules?",
  "How does NestJS handle exception filters and error handling?",
  "What are NestJS pipes and how do you use them for validation?",
  "How do you connect NestJS to a database using TypeORM or Prisma?",
  "What is the lifecycle of a NestJS request from incoming to response?",
];

function sampleQuestions(count: number): string[] {
  const shuffled = [...NESTJS_SAMPLE_QUESTIONS];
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
  const { data } = useSWR<{ items: DocumentItem[] }>("/api/documents", fetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
  });

  const nestjsDoc = data?.items.find(
    (d) => d.isBuiltIn && d.status === "indexed" && d.name.toLowerCase().includes("nestjs"),
  );

  // Stable per mount — re-randomizes each time user opens a new chat

  const questions = useMemo(() => sampleQuestions(4), []);

  const cols = [questions.slice(0, 2), questions.slice(2)];

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-4">
      <p className="text-muted-foreground text-sm">Ask a question about your knowledge base</p>

      {nestjsDoc && (
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
