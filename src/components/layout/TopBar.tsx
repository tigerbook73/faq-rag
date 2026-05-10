"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon, LogOut, LogIn, LibraryBig, ShieldCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ProviderSelect } from "@/components/chat/ProviderSelect";
import { usePageTitle } from "@/context/page-title-context";
import { useProvider } from "@/context/provider-context";
import { useAuth } from "@/context/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { getLastChatHref } from "@/lib/last-chat";
import { isSignInRoute, shouldHideSidebar } from "@/lib/route-policy";

function AuthButton({
  isAuthLoading,
  isAuthenticated,
  email,
}: {
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  email: string | null;
}) {
  if (isAuthLoading) return <Skeleton className="h-8 w-8 rounded-full" />;
  if (isAuthenticated)
    return (
      <Button
        variant="ghost"
        size="icon"
        title={email ? `Sign out (${email})` : "Sign out"}
        aria-label={email ? `Sign out (${email})` : "Sign out"}
        nativeButton={false}
        render={<Link href="/auth/signout" />}
      >
        <LogOut className="h-4 w-4" />
      </Button>
    );
  return (
    <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/auth/signin" />}>
      <LogIn className="h-4 w-4" />
      Sign In
    </Button>
  );
}

export function TopBar() {
  const { isAuthenticated, isAuthLoading, role, email } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const { subtitle } = usePageTitle();
  const { provider, setProvider } = useProvider();

  const isSignIn = isSignInRoute(pathname);
  const hideSidebar = shouldHideSidebar(pathname, isAuthenticated);
  const isChat = pathname.startsWith("/chat");

  return (
    <header className="bg-background flex h-12 shrink-0 items-center justify-between border-b px-3 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {hideSidebar || (!isAuthenticated && !isAuthLoading) ? (
          <LibraryBig className="size-6 shrink-0" />
        ) : (
          <SidebarTrigger className="size-10 shrink-0">
            <LibraryBig className="size-6" />
          </SidebarTrigger>
        )}
        <Link href="/chat/new" className="truncate text-base font-bold">
          FAQ-RAG
        </Link>
        {isChat && subtitle && (
          <>
            <span className="text-muted-foreground hidden sm:inline">/</span>
            <span className="text-muted-foreground hidden max-w-30 truncate text-sm sm:inline sm:max-w-50">
              {subtitle}
            </span>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {isChat && (
          <>
            <ProviderSelect value={provider} onChange={setProvider} />
            <Separator orientation="vertical" className="my-2 hidden self-stretch sm:block" />
          </>
        )}
        <nav className="mr-2 hidden items-center gap-3 text-sm md:flex">
          {!isSignIn && isAuthenticated && (
            <>
              <Link
                href="/chat/last"
                className={isChat ? "font-medium" : "text-muted-foreground"}
                onClick={(event) => {
                  event.preventDefault();
                  router.push(getLastChatHref());
                }}
              >
                Chat
              </Link>
              <Link href="/knowledge" className={pathname === "/knowledge" ? "font-medium" : "text-muted-foreground"}>
                Knowledge
              </Link>
            </>
          )}
          <Link href="/about" className={pathname === "/about" ? "font-medium" : "text-muted-foreground"}>
            About
          </Link>
        </nav>
        {!isSignIn && <Separator orientation="vertical" className="my-2 hidden self-stretch md:block" />}
        {!isSignIn && role === "admin" && (
          <Button
            variant="ghost"
            size="icon"
            title="Admin Portal"
            aria-label="Admin Portal"
            nativeButton={false}
            render={<Link href="/admin" />}
          >
            <ShieldCog className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          title="Toggle theme"
          aria-label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="hidden h-4 w-4 dark:block" />
        </Button>
        {!isSignIn && <AuthButton isAuthLoading={isAuthLoading} isAuthenticated={isAuthenticated} email={email} />}
      </div>
    </header>
  );
}
