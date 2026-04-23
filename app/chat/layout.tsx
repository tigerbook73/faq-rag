"use client";

import { useState, useEffect } from "react";
import { ChatSidebar } from "@/src/components/chat/ChatSidebar";
import { PanelLeft } from "lucide-react";
import { pruneOldSessions } from "@/src/lib/chat-storage";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    pruneOldSessions();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <ChatSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="relative flex-1 overflow-hidden">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-3 left-3 z-10 p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Open sidebar"
          >
            <PanelLeft size={18} />
          </button>
        )}
        {children}
      </main>
    </div>
  );
}
