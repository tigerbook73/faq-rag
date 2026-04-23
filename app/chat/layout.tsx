"use client";

import { useState, useEffect } from "react";
import { ChatSidebar } from "@/src/components/chat/ChatSidebar";
import { pruneOldSessions } from "@/src/lib/chat-storage";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    pruneOldSessions();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <ChatSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpen={() => setSidebarOpen(true)}
      />
      <main className="relative flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
