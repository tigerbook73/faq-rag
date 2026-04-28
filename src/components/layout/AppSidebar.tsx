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
import { ChatSidebarContent } from "@/src/components/chat/ChatSidebar";
import { Info } from "lucide-react";

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
