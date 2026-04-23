"use client";

import { useSyncExternalStore, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  listSessions,
  deleteSession,
  getLastChatId,
  type ChatSession,
} from "@/src/lib/chat-storage";
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
import { SquarePen } from "lucide-react";

function subscribe(callback: () => void) {
  window.addEventListener("chat-session-updated", callback);
  return () => window.removeEventListener("chat-session-updated", callback);
}

const EMPTY_SESSIONS: ChatSession[] = [];

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

  const sessions = useSyncExternalStore(subscribe, listSessions, () => EMPTY_SESSIONS);
  const lastChatId = useSyncExternalStore(subscribe, getLastChatId, () => null);

  const handleNew = useCallback(() => {
    router.push("/chat/new");
  }, [router]);

  const handleDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      deleteSession(id);
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
          <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">
            FAQ-RAG
          </span>
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
              {sessions.length === 0 && (
                <p className="px-2 py-1 text-xs text-muted-foreground">No chats yet</p>
              )}
              {sessions.map((s: ChatSession) => {
                const active = pathname === `/chat/${s.id}`;
                return (
                  <SidebarMenuItem key={s.id}>
                    <SidebarMenuButton
                      isActive={active}
                      onClick={() => router.push(`/chat/${s.id}`)}
                      className="h-auto overflow-visible items-start"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{s.title}</p>
                        <p className="text-xs text-muted-foreground">{relativeDate(s.updatedAt)}</p>
                      </div>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      showOnHover
                      onClick={(e) => handleDelete(e, s.id)}
                      aria-label="Delete chat"
                    >
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
