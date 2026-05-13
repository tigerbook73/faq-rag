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
import type { InitialAuthState } from "@/context/auth-context";
import { useAuth } from "@/context/auth-context";
import { isAdminRoute, shouldHideSidebar } from "@/lib/server/route-policy";

function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const pathname = usePathname();
  const isAdmin = isAdminRoute(pathname);
  const hideSidebar = shouldHideSidebar(pathname, isAuthenticated);

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
      {!hideSidebar && (isAuthenticated || isAuthLoading) && <AppSidebar />}
      <SidebarInset className="flex flex-col overflow-hidden">
        <TopBar />
        {children}
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}

export function Providers({
  children,
  initialAuthState,
}: {
  children: React.ReactNode;
  initialAuthState: InitialAuthState;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthContextProvider initialAuthState={initialAuthState}>
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
