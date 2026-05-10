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
  SidebarMenuSkeleton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { SquarePen, Info, BookOpen, MessageSquare, RefreshCw } from "lucide-react";
import Link from "next/link";
import { type ChatSession } from "@/lib/session-api";
import { useAuth } from "@/context/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function ChatSidebarContent() {
  const { email } = useAuth();
  const {
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
    reloadSessions,
    pathname,
  } = useChatSessions();

  const showSessionSkeletons = isLoadingSessions && sessions.length === 0;
  const showSessionError = !!sessionsError && sessions.length === 0;
  const showEmptySessions = !isLoadingSessions && !sessionsError && sessions.length === 0;

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center justify-between">
          <SidebarTrigger />
          {email && (
            <div className="flex min-w-0 items-center gap-2 overflow-hidden group-data-[state=collapsed]/sidebar-wrapper:hidden">
              <Avatar className="size-6 shrink-0">
                <AvatarFallback className="text-xs">{email.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-muted-foreground truncate text-xs">{email}</span>
            </div>
          )}
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
              {showSessionSkeletons && <SessionListSkeleton />}
              {showSessionError && (
                <SidebarMenuItem>
                  <div className="text-muted-foreground space-y-2 px-2 py-1 text-xs">
                    <p>{sessionsError}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="h-6 px-1.5"
                      onClick={() => void reloadSessions()}
                    >
                      <RefreshCw className="size-3" />
                      Retry
                    </Button>
                  </div>
                </SidebarMenuItem>
              )}
              {showEmptySessions && <p className="text-muted-foreground px-2 py-1 text-xs">No chats yet</p>}
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
              {isRefreshingSessions && sessions.length > 0 && <SidebarMenuSkeleton width="62%" />}
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
              render={
                <Link
                  href="/chat/last"
                  onClick={(event) => {
                    event.preventDefault();
                    navigateToLastChat();
                  }}
                />
              }
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
      </SidebarFooter>
    </>
  );
}

function SessionListSkeleton() {
  return (
    <>
      <SidebarMenuSkeleton width="72%" />
      <SidebarMenuSkeleton width="86%" />
      <SidebarMenuSkeleton width="64%" />
      <SidebarMenuSkeleton width="78%" />
    </>
  );
}
