"use client";

import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import type { listSessionsForUser } from "@/lib/server/data/sessions";

type SessionSummary = Awaited<ReturnType<typeof listSessionsForUser>>[number];

const SESSIONS_KEY = "/api/sessions";

export function SWRBootstrap({
  fallbackSessions,
  children,
}: {
  fallbackSessions: SessionSummary[];
  children: ReactNode;
}) {
  return <SWRConfig value={{ fallback: { [SESSIONS_KEY]: fallbackSessions } }}>{children}</SWRConfig>;
}
