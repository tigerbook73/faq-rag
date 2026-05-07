"use client";

import { AdminTopBar } from "./AdminTopBar";
import { AdminSidebar } from "./AdminSidebar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <AdminTopBar />
      <div className="flex min-h-0 flex-1">
        <AdminSidebar />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
