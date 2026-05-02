"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { useRouter, usePathname } from "next/navigation";
import { fetchSessions, apiDeleteSession, updateSessionTitle, fetchSession, type ChatSession } from "@/lib/session-api";
import { lastChat } from "@/lib/last-chat";
import { CHAT_EVENTS } from "@/lib/constants";
import { useSidebar } from "@/components/ui/sidebar";

export function useChatSessions() {
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  const lastChatId = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener(CHAT_EVENTS.LAST_CHANGED, onStoreChange);
      return () => window.removeEventListener(CHAT_EVENTS.LAST_CHANGED, onStoreChange);
    },
    () => lastChat.get(),
    () => null,
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const closeOnMobile = useCallback(() => {
    if (isMobile) setOpenMobile(false);
  }, [isMobile, setOpenMobile]);

  // Initial session fetch
  useEffect(() => {
    let active = true;
    fetchSessions().then((data) => {
      if (active) setSessions(data);
    });
    return () => {
      active = false;
    };
  }, []);

  // Re-fetch sessions when any component dispatches chat-session-updated
  useEffect(() => {
    function onUpdate() {
      fetchSessions().then((data) => setSessions(data));
    }
    window.addEventListener(CHAT_EVENTS.SESSION_UPDATED, onUpdate);
    return () => window.removeEventListener(CHAT_EVENTS.SESSION_UPDATED, onUpdate);
  }, []);

  // Focus input when edit mode activates
  useEffect(() => {
    if (editingId) {
      // Small timeout to ensure DOM is ready if needed,
      // but usually inputRef.current?.select() works if triggered by state change
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
      await updateSessionTitle(id, trimmed);
      window.dispatchEvent(new CustomEvent(CHAT_EVENTS.SESSION_UPDATED));
    },
    [editValue],
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
      await apiDeleteSession(id);
      window.dispatchEvent(new CustomEvent(CHAT_EVENTS.SESSION_UPDATED));
      if (pathname === `/chat/${id}`) router.replace("/chat/new");
    },
    [pathname, router],
  );

  const navigateToSession = useCallback(
    (id: string) => {
      router.push(`/chat/${id}`);
      closeOnMobile();
    },
    [router, closeOnMobile],
  );

  return {
    sessions,
    lastChatId,
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
    closeOnMobile,
    pathname,
  };
}
