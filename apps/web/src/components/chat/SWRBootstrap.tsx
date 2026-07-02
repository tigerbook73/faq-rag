"use client";

import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import type { listSessions } from "@/lib/server/data/sessions";

type SessionSummary = Awaited<ReturnType<typeof listSessions>>[number];

const SESSIONS_KEY = "/api/sessions";

export function SWRBootstrap({
  fallbackSessions,
  children,
}: {
  fallbackSessions: SessionSummary[];
  children: ReactNode;
}) {
  const sessions = fallbackSessions.map((s) => ({
    ...s,
    messages: [],
    createdAt: new Date(s.createdAt as unknown as string).getTime(),
    updatedAt: new Date(s.updatedAt as unknown as string).getTime(),
  }));
  return <SWRConfig value={{ fallback: { [SESSIONS_KEY]: sessions } }}>{children}</SWRConfig>;
}
