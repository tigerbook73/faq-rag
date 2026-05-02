"use client";

import { useChatSessions } from "./useChatSessions";
import { SessionItem } from "../SessionItem";
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { SquarePen, Info, BookOpen, MessageSquare } from "lucide-react";
import Link from "next/link";
import { type ChatSession } from "@/lib/session-api";

export function ChatSidebarContent() {
  const {
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
  } = useChatSessions();

  const showBackToLast = !!(lastChatId && pathname !== `/chat/${lastChatId}`);

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
                  onNavigate={() => navigateToSession(s.id)}
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
              navigateToSession("last"); // Note: /chat/last is handled by a page redirect
            }}
          >
            ↩ Back to last chat
          </Button>
        )}
      </SidebarFooter>
    </>
  );
}
