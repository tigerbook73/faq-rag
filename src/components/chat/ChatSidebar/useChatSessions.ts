"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import useSWR from "swr";
import { apiDeleteSession, updateSessionTitle, fetchSession, type ChatSession } from "@/lib/session-api";
import { getLastChatHref } from "@/lib/last-chat";
import { useSidebar } from "@/components/ui/sidebar";

const SWR_KEY = "/api/sessions";
const fetcher = (url: string) =>
  fetch(url)
    .then((r) => r.json())
    .then((data) => data as ChatSession[]);

export function useChatSessions() {
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const {
    data: sessions = [],
    isLoading: isLoadingSessions,
    mutate,
  } = useSWR<ChatSession[]>(SWR_KEY, fetcher);

  const [isRefreshingSessions, setIsRefreshingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const closeOnMobile = useCallback(() => {
    if (isMobile) setOpenMobile(false);
  }, [isMobile, setOpenMobile]);

  // Focus input when edit mode activates
  useEffect(() => {
    if (editingId) {
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [editingId]);

  const startEdit = useCallback((id: string, title: string) => {
    setEditingId(id);
    setEditValue(title);
  }, []);

  const commitEdit = useCallback(
    async (id: string) => {
      const trimmed = editValue.trim();
      setEditingId(null);
      if (!trimmed) return;
      mutate(
        (current) => current?.map((s) => (s.id === id ? { ...s, title: trimmed } : s)),
        false,
      );
      try {
        await updateSessionTitle(id, trimmed);
      } catch {
        void mutate();
      }
    },
    [editValue, mutate],
  );

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const handleNew = useCallback(() => {
    router.push("/chat/new");
    closeOnMobile();
  }, [router, closeOnMobile]);

  const handleExport = useCallback(async (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    const session = await fetchSession(id);
    if (!session) return;

    const lines: string[] = [`# ${session.title}`, `> Exported ${new Date(session.updatedAt).toLocaleString()}`, ""];
    for (const msg of session.messages) {
      lines.push(`**${msg.role === "user" ? "User" : "Assistant"}**`);
      lines.push("");
      lines.push(msg.content);
      if (msg.citations?.length) {
        lines.push("");
        lines.push("*Sources: " + msg.citations.map((c) => c.documentName).join(", ") + "*");
      }
      lines.push("");
      lines.push("---");
      lines.push("");
    }

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleDelete = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      mutate(
        (current) => current?.filter((s) => s.id !== id),
        false,
      );
      if (pathname === `/chat/${id}`) router.replace("/chat/new");
      try {
        await apiDeleteSession(id);
      } catch {
        void mutate();
      }
    },
    [pathname, router, mutate],
  );

  const navigateToSession = useCallback(
    (id: string) => {
      router.push(`/chat/${id}`);
      closeOnMobile();
    },
    [router, closeOnMobile],
  );

  const navigateToLastChat = useCallback(() => {
    router.push(getLastChatHref());
    closeOnMobile();
  }, [router, closeOnMobile]);

  return {
    sessions,
    isLoadingSessions,
    isRefreshingSessions,
    sessionsError,
    editingId,
    editValue,
    inputRef,
    setEditValue,
    startEdit,
    commitEdit,
    cancelEdit,
    handleNew,
    handleExport,
    handleDelete,
    navigateToSession,
    navigateToLastChat,
    closeOnMobile,
    reloadSessions: mutate,
    pathname,
  };
}
