"use client";

import { AdminTopBar } from "./AdminTopBar";
import { AdminSidebar } from "./AdminSidebar";

export function AdminShell({ children, email }: { children: React.ReactNode; email: string | null }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <AdminTopBar email={email} />
      <div className="flex min-h-0 flex-1">
        <AdminSidebar />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
