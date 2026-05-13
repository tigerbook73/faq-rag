"use client";

import { Download } from "lucide-react";
import { type ChatSession } from "@/lib/client/session-api";
import { SidebarMenuAction, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

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

export function SessionItem({
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
