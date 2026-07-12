"use client";

import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import type { listSessions } from "@/lib/server/data/sessions";
import type { listSampleQuestions } from "@/lib/server/data/sample-questions";

type SessionSummary = Awaited<ReturnType<typeof listSessions>>[number];
type SampleQuestionSummary = Awaited<ReturnType<typeof listSampleQuestions>>[number];

const SESSIONS_KEY = "/api/sessions";
const SAMPLE_QUESTIONS_KEY = "/api/sample-questions";

export function SWRBootstrap({
  fallbackSessions,
  fallbackSampleQuestions,
  children,
}: {
  fallbackSessions: SessionSummary[];
  fallbackSampleQuestions: SampleQuestionSummary[];
  children: ReactNode;
}) {
  const sessions = fallbackSessions.map((s) => ({
    ...s,
    messages: [],
    createdAt: new Date(s.createdAt as unknown as string).getTime(),
    updatedAt: new Date(s.updatedAt as unknown as string).getTime(),
  }));
  return (
    <SWRConfig
      value={{
        fallback: {
          [SESSIONS_KEY]: sessions,
          [SAMPLE_QUESTIONS_KEY]: { items: fallbackSampleQuestions },
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
