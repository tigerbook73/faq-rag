"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminTopBar } from "./AdminTopBar";
import { AdminSidebar } from "./AdminSidebar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true} className="h-full overflow-hidden">
      <AdminSidebar />
      <SidebarInset className="flex flex-col overflow-hidden">
        <AdminTopBar />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
