"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { useRouter, usePathname } from "next/navigation";
import { fetchSessions, apiDeleteSession, updateSessionTitle, type ChatSession } from "@/lib/session-api";
import { lastChat } from "@/lib/last-chat";
import { CHAT_EVENTS } from "@/lib/constants";
import {
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { SquarePen, Download, Info, BookOpen, MessageSquare } from "lucide-react";
import Link from "next/link";
import { fetchSession } from "@/lib/session-api";

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

interface SessionItemProps {
  session: ChatSession;
  active: boolean;
  isEditing: boolean;
  editValue: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onNavigate: () => void;
  onDoubleClick: () => void;
  onEditChange: (value: string) => void;
  onCommit: () => void;
  onCancelEdit: () => void;
  onExport: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

function SessionItem({
  session,
  active,
  isEditing,
  editValue,
  inputRef,
  onNavigate,
  onDoubleClick,
  onEditChange,
  onCommit,
  onCancelEdit,
  onExport,
  onDelete,
}: SessionItemProps) {
  return (
    <SidebarMenuItem key={session.id}>
      <SidebarMenuButton
        isActive={active}
        onClick={() => {
          if (!isEditing) onNavigate();
        }}
        onDoubleClick={onDoubleClick}
        className="h-auto items-start overflow-visible"
      >
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onCommit();
                }
                if (e.key === "Escape") onCancelEdit();
              }}
              onBlur={onCommit}
              onClick={(e) => e.stopPropagation()}
              className="border-primary w-full border-b bg-transparent text-sm outline-none"
            />
          ) : (
            <p className="truncate text-sm">{session.title}</p>
          )}
          <p className="text-muted-foreground text-xs">{relativeDate(session.updatedAt)}</p>
        </div>
      </SidebarMenuButton>
      <SidebarMenuAction showOnHover onClick={onExport} aria-label="Export chat" className="right-7">
        <Download className="h-3.5 w-3.5" />
      </SidebarMenuAction>
      <SidebarMenuAction showOnHover onClick={onDelete} aria-label="Delete chat">
        ✕
      </SidebarMenuAction>
    </SidebarMenuItem>
  );
}

export function ChatSidebarContent() {
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
    if (editingId) inputRef.current?.select();
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

  const closeOnMobile = useCallback(() => {
    if (isMobile) setOpenMobile(false);
  }, [isMobile, setOpenMobile]);

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

  const showBackToLast = lastChatId && pathname !== `/chat/${lastChatId}`;

  return (
    <>
      <SidebarHeader>
        <div className="hidden items-center justify-between md:flex">
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
              {sessions.length === 0 && <p className="text-muted-foreground px-2 py-1 text-xs">No chats yet</p>}
              {sessions.map((s: ChatSession) => (
                <SessionItem
                  key={s.id}
                  session={s}
                  active={pathname === `/chat/${s.id}`}
                  isEditing={editingId === s.id}
                  editValue={editValue}
                  inputRef={inputRef}
                  onNavigate={() => {
                    router.push(`/chat/${s.id}`);
                    closeOnMobile();
                  }}
                  onDoubleClick={() => startEdit(s.id, s.title)}
                  onEditChange={setEditValue}
                  onCommit={() => void commitEdit(s.id)}
                  onCancelEdit={cancelEdit}
                  onExport={(e) => handleExport(e, s.id, s.title)}
                  onDelete={(e) => handleDelete(e, s.id)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname.startsWith("/chat")}
              tooltip="Chat"
              render={<Link href="/chat/last" onClick={closeOnMobile} />}
            >
              <MessageSquare />
              <span>Chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === "/knowledge"}
              tooltip="Knowledge"
              render={<Link href="/knowledge" onClick={closeOnMobile} />}
            >
              <BookOpen />
              <span>Knowledge</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="About"
              isActive={pathname === "/about"}
              render={<Link href="/about" onClick={closeOnMobile} />}
            >
              <Info />
              <span>About</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {showBackToLast && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground w-full justify-start group-data-[collapsible=icon]:hidden"
            onClick={() => {
              router.push("/chat/last");
              closeOnMobile();
            }}
          >
            ↩ Back to last chat
          </Button>
        )}
      </SidebarFooter>
    </>
  );
}
