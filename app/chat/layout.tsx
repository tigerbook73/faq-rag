"use client";

import { ChatSidebar } from "@/src/components/chat/ChatSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={false} className="h-screen overflow-hidden">
        <ChatSidebar />
        <SidebarInset className="overflow-hidden">{children}</SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
