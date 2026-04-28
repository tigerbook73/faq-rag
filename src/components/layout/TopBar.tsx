"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon, LogOut, LogIn, LibraryBig } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ProviderSelect } from "@/components/chat/ProviderSelect";
import { usePageTitle } from "@/context/page-title-context";
import { useProvider } from "@/context/provider-context";
import { logout } from "@/app/actions/auth";

export function TopBar({ isAuthenticated }: { isAuthenticated: boolean }) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const { subtitle } = usePageTitle();
  const { provider, setProvider } = useProvider();

  const isSignIn = pathname === "/auth/signin";
  const isChat = pathname.startsWith("/chat");

  return (
    <header className="h-12 flex items-center justify-between px-4 border-b bg-background shrink-0">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden" />
        <LibraryBig className="size-6" />
        <Link href="/chat/new" className="font-bold text-base">
          FAQ-RAG
        </Link>
        {isChat && subtitle && (
          <>
            <span className="text-muted-foreground hidden sm:inline">/</span>
            <span className="hidden sm:inline text-sm text-muted-foreground truncate max-w-[120px] sm:max-w-[200px]">{subtitle}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isChat && (
          <>
            <span className="hidden sm:inline text-sm text-muted-foreground">Provider:</span>
            <ProviderSelect value={provider} onChange={setProvider} />
            <Separator orientation="vertical" className="self-stretch my-2" />
          </>
        )}
        {!isSignIn && (
          <>
            <nav className="mr-2 hidden md:flex items-center gap-3 text-sm">
              <Link href="/chat/new" className={isChat ? "font-medium" : "text-muted-foreground"}>
                Chat
              </Link>
              <Link href="/knowledge" className={pathname === "/knowledge" ? "font-medium" : "text-muted-foreground"}>
                Knowledge
              </Link>
              <Link href="/about" className={pathname === "/about" ? "font-medium" : "text-muted-foreground"}>
                About
              </Link>
            </nav>
            <Separator orientation="vertical" className="self-stretch my-2 hidden md:block" />
          </>
        )}
        <Button variant="ghost" size="icon" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="hidden h-4 w-4 dark:block" />
        </Button>
        {!isSignIn &&
          (isAuthenticated ? (
            <form action={logout}>
              <Button variant="ghost" size="icon" type="submit" title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/auth/signin" />}>
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          ))}
      </div>
    </header>
  );
}
