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

export function Providers({
  children,
  isAuthenticated,
  role,
  email,
}: {
  children: React.ReactNode;
  isAuthenticated: boolean;
  role: "user" | "admin" | null;
  email: string | null;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthContextProvider initialAuth={isAuthenticated} initialRole={role} initialEmail={email}>
        <PageTitleProvider>
          <ProviderContextProvider>
            <TooltipProvider>
              {isAdmin ? (
                <>
                  {children}
                  <Toaster />
                </>
              ) : (
                <SidebarProvider defaultOpen={true} className="h-full overflow-hidden">
                  <AppSidebar />
                  <SidebarInset className="flex flex-col overflow-hidden">
                    <TopBar />
                    {children}
                  </SidebarInset>
                  <Toaster />
                </SidebarProvider>
              )}
            </TooltipProvider>
          </ProviderContextProvider>
        </PageTitleProvider>
      </AuthContextProvider>
    </ThemeProvider>
  );
}
