"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ChatSidebarContent } from "@/components/chat/ChatSidebar";
import { Info, MessageSquare, BookOpen } from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();
  const isChat = pathname.startsWith("/chat");

  return (
    <Sidebar collapsible="icon">
      {isChat ? (
        <ChatSidebarContent />
      ) : (
        <>
          <SidebarHeader>
            <div className="flex items-center justify-between">
              <SidebarTrigger />
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive={pathname.startsWith("/chat")} tooltip="Chat" render={<Link href="/chat/new" />}>
                      <MessageSquare />
                      <span>Chat</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive={pathname === "/knowledge"} tooltip="Knowledge" render={<Link href="/knowledge" />}>
                      <BookOpen />
                      <span>Knowledge</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive={pathname === "/about"} tooltip="About" render={<Link href="/about" />}>
                      <Info />
                      <span>About</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </>
      )}
    </Sidebar>
  );
}
