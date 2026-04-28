"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
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

export function AppSidebar({ isAuthenticated }: { isAuthenticated: boolean }) {
  const pathname = usePathname();
  const isChat = pathname.startsWith("/chat");
  const { isMobile, setOpenMobile } = useSidebar();

  const closeOnMobile = useCallback(() => {
    if (isMobile) setOpenMobile(false);
  }, [isMobile, setOpenMobile]);

  return (
    <Sidebar collapsible="icon">
      {isChat ? (
        <ChatSidebarContent />
      ) : (
        <>
          <SidebarHeader>
            <div className="hidden md:flex items-center justify-between">
              <SidebarTrigger />
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
                      render={<Link href="/chat/new" onClick={closeOnMobile} />}
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
