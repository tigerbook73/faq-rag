"use client";

import { useEffect } from "react";
import { ChatSidebar } from "@/src/components/chat/ChatSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { pruneOldSessions } from "@/src/lib/chat-storage";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    pruneOldSessions();
  }, []);

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={false} className="h-screen overflow-hidden">
        <ChatSidebar />
        <SidebarInset className="overflow-hidden">
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
