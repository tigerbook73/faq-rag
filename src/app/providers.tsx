"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/src/components/ui/sonner";
import { SidebarProvider, SidebarInset } from "@/src/components/ui/sidebar";
import { TooltipProvider } from "@/src/components/ui/tooltip";
import { AppSidebar } from "@/src/components/layout/AppSidebar";
import { TopBar } from "@/src/components/layout/TopBar";
import { PageTitleProvider } from "@/src/context/page-title-context";
import { ProviderContextProvider } from "@/src/context/provider-context";

export function Providers({ children, isAuthenticated }: { children: React.ReactNode; isAuthenticated: boolean }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <PageTitleProvider>
        <ProviderContextProvider>
          <TooltipProvider>
            <SidebarProvider defaultOpen={true} className="h-screen overflow-hidden">
              <AppSidebar />
              <SidebarInset className="overflow-hidden flex flex-col">
                <TopBar isAuthenticated={isAuthenticated} />
                {children}
              </SidebarInset>
            </SidebarProvider>
            <Toaster />
          </TooltipProvider>
        </ProviderContextProvider>
      </PageTitleProvider>
    </ThemeProvider>
  );
}
