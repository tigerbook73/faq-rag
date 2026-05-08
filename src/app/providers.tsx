"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { PageTitleProvider } from "@/context/page-title-context";
import { ProviderContextProvider } from "@/context/provider-context";
import { AuthContextProvider } from "@/context/auth-context";
import { useAuth } from "@/context/auth-context";

function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return (
      <>
        {children}
        <Toaster />
      </>
    );
  }

  return (
    <SidebarProvider defaultOpen={true} className="h-full overflow-hidden">
      {isAuthenticated && <AppSidebar />}
      <SidebarInset className="flex flex-col overflow-hidden">
        <TopBar />
        {children}
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthContextProvider>
        <PageTitleProvider>
          <ProviderContextProvider>
            <TooltipProvider>
              <AppLayout>{children}</AppLayout>
            </TooltipProvider>
          </ProviderContextProvider>
        </PageTitleProvider>
      </AuthContextProvider>
    </ThemeProvider>
  );
}
