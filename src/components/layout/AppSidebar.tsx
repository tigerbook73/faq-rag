"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { ChatSidebarContent } from "@/components/chat/ChatSidebar";
import { Info, MessageSquare, BookOpen } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getLastChatHref } from "@/lib/last-chat";

export function AppSidebar() {
  const { isAuthenticated, role, email } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isChat = pathname.startsWith("/chat");
  const { isMobile, setOpenMobile } = useSidebar();

  const closeOnMobile = useCallback(() => {
    if (isMobile) setOpenMobile(false);
  }, [isMobile, setOpenMobile]);

  const navigateToLastChat = useCallback(() => {
    router.push(getLastChatHref());
    closeOnMobile();
  }, [router, closeOnMobile]);

  return (
    <Sidebar collapsible="icon">
      {isChat ? (
        <ChatSidebarContent />
      ) : (
        <>
          <SidebarHeader>
            <div className="flex items-center justify-between">
              <SidebarTrigger />
              {email && (
                <div className="group-data-[state=collapsed]/sidebar-wrapper:hidden flex min-w-0 items-center gap-2 overflow-hidden">
                  <Avatar className="size-6 shrink-0">
                    <AvatarFallback className="text-xs">{email.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-muted-foreground truncate text-xs">{email}</span>
                </div>
              )}
            </div>
          </SidebarHeader>
          <SidebarContent />
          <SidebarFooter>
            <SidebarMenu>
              {isAuthenticated && (
                <>
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
                </>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/about"}
                  tooltip="About"
                  render={<Link href="/about" onClick={closeOnMobile} />}
                >
                  <Info />
                  <span>About</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </>
      )}
    </Sidebar>
  );
}
