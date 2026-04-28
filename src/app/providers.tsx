"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { PageTitleProvider } from "@/context/page-title-context";
import { ProviderContextProvider } from "@/context/provider-context";

export function Providers({ children, isAuthenticated }: { children: React.ReactNode; isAuthenticated: boolean }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <PageTitleProvider>
        <ProviderContextProvider>
          <TooltipProvider>
            <SidebarProvider defaultOpen={true} className="h-screen overflow-hidden">
              <AppSidebar isAuthenticated={isAuthenticated} />
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
