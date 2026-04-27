"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { fetchSessions, apiDeleteSession, updateSessionTitle, getLastChatId, type ChatSession } from "@/src/lib/chat-storage";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { SquarePen, Download } from "lucide-react";
import { fetchSession } from "@/src/lib/chat-storage";

function relativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ChatSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [lastChatId, setLastChatId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Initial session load — both setState calls inside .then() to avoid SSR hydration mismatch
  useEffect(() => {
    let active = true;
    const lastId = getLastChatId();
    fetchSessions().then((data) => {
      if (active) {
        setSessions(data);
        setLastChatId(lastId);
      }
    });
    return () => { active = false; };
  }, []);

  // Re-fetch when any component dispatches chat-session-updated
  useEffect(() => {
    function onUpdate() {
      setLastChatId(getLastChatId());
      fetchSessions().then((data) => setSessions(data));
    }
    window.addEventListener("chat-session-updated", onUpdate);
    return () => window.removeEventListener("chat-session-updated", onUpdate);
  }, []);

  // Focus input when edit mode activates
  useEffect(() => {
    if (editingId) inputRef.current?.select();
  }, [editingId]);

  const startEdit = useCallback((id: string, title: string) => {
    setEditingId(id);
    setEditValue(title);
  }, []);

  const commitEdit = useCallback(async (id: string) => {
    const trimmed = editValue.trim();
    setEditingId(null);
    if (!trimmed) return;
    await updateSessionTitle(id, trimmed);
    window.dispatchEvent(new CustomEvent("chat-session-updated"));
  }, [editValue]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const handleNew = useCallback(() => {
    router.push("/chat/new");
  }, [router]);

  const handleExport = useCallback(async (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    const session = await fetchSession(id);
    if (!session) return;

    const lines: string[] = [
      `# ${session.title}`,
      `> Exported ${new Date(session.updatedAt).toLocaleString()}`,
      "",
    ];
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
      window.dispatchEvent(new CustomEvent("chat-session-updated"));
      if (pathname === `/chat/${id}`) router.replace("/chat/new");
    },
    [pathname, router],
  );

  const showBackToLast = lastChatId && pathname !== `/chat/${lastChatId}`;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">FAQ-RAG</span>
          <SidebarTrigger />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="New Chat" onClick={handleNew}>
                  <SquarePen />
                  <span>New Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupContent>
            <SidebarMenu>
              {sessions.length === 0 && <p className="px-2 py-1 text-xs text-muted-foreground">No chats yet</p>}
              {sessions.map((s: ChatSession) => {
                const active = pathname === `/chat/${s.id}`;
                const isEditing = editingId === s.id;
                return (
                  <SidebarMenuItem key={s.id}>
                    <SidebarMenuButton
                      isActive={active}
                      onClick={() => !isEditing && router.push(`/chat/${s.id}`)}
                      onDoubleClick={() => startEdit(s.id, s.title)}
                      className="h-auto overflow-visible items-start"
                    >
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <input
                            ref={inputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { e.preventDefault(); void commitEdit(s.id); }
                              if (e.key === "Escape") cancelEdit();
                            }}
                            onBlur={() => void commitEdit(s.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full text-sm bg-transparent border-b border-primary outline-none"
                          />
                        ) : (
                          <p className="truncate text-sm">{s.title}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{relativeDate(s.updatedAt)}</p>
                      </div>
                    </SidebarMenuButton>
                    <SidebarMenuAction showOnHover onClick={(e) => handleExport(e, s.id, s.title)} aria-label="Export chat" className="right-7">
                      <Download className="h-3.5 w-3.5" />
                    </SidebarMenuAction>
                    <SidebarMenuAction showOnHover onClick={(e) => handleDelete(e, s.id)} aria-label="Delete chat">
                      ✕
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {showBackToLast && (
        <SidebarFooter className="group-data-[collapsible=icon]:hidden">
          <button
            onClick={() => router.push("/chat/last")}
            className="w-full px-2 text-sm text-muted-foreground hover:text-foreground text-left transition-colors"
          >
            ↩ Back to last chat
          </button>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
