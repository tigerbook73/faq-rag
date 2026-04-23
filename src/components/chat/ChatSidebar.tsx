"use client";

import { useSyncExternalStore, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { listSessions, deleteSession, getLastChatId, type ChatSession } from "@/src/lib/chat-storage";
import { Button } from "@/components/ui/button";
import { PanelLeftClose } from "lucide-react";

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

interface ChatSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function ChatSidebar({ open, onClose }: ChatSidebarProps) {
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
    <aside
      className={`flex flex-col shrink-0 border-r h-full bg-background overflow-hidden transition-[width] duration-200 ease-in-out ${
        open ? "w-60" : "w-0"
      }`}
    >
      <div className="flex items-center justify-between px-3 py-3 border-b">
        <Button variant="outline" className="flex-1 mr-2" onClick={handleNew}>
          New Chat
        </Button>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Close sidebar"
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {sessions.length === 0 && (
          <p className="px-4 text-xs text-muted-foreground mt-4">No chats yet</p>
        )}
        {sessions.map((s: ChatSession) => {
          const active = pathname === `/chat/${s.id}`;
          return (
            <div
              key={s.id}
              onClick={() => router.push(`/chat/${s.id}`)}
              className={`group flex items-center justify-between px-3 py-2 cursor-pointer rounded-md mx-1 ${
                active ? "bg-accent" : "hover:bg-accent/50"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">{s.title}</p>
                <p className="text-xs text-muted-foreground">{relativeDate(s.updatedAt)}</p>
              </div>
              <button
                onClick={(e) => handleDelete(e, s.id)}
                className="ml-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
                aria-label="Delete chat"
              >
                ✕
              </button>
            </div>
          );
        })}
      </nav>

      {showBackToLast && (
        <div className="px-3 py-3 border-t">
          <button
            onClick={() => router.push("/chat/last")}
            className="w-full text-sm text-muted-foreground hover:text-foreground text-left transition-colors"
          >
            ↩ Back to last chat
          </button>
        </div>
      )}
    </aside>
  );
}
