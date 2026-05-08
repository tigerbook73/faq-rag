"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { LibraryBig, Sun, Moon, LogOut, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getLastChatHref } from "@/lib/last-chat";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/auth-context";

export function AdminTopBar() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { email } = useAuth();

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/auth/signin");
  }

  return (
    <header className="bg-background flex h-12 shrink-0 items-center justify-between border-b px-3 sm:px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="size-10 shrink-0 md:hidden">
          <LibraryBig className="size-6" />
        </SidebarTrigger>
        <LibraryBig className="hidden size-6 shrink-0 md:block" />
        <span className="text-base font-bold">FAQ-RAG Admin</span>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          title="Go to Chat"
          aria-label="Go to Chat"
          onClick={() => router.push(getLastChatHref())}
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="my-2 self-stretch" />
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
        <Button
          variant="ghost"
          size="icon"
          title={email ? `Sign out (${email})` : "Sign out"}
          aria-label={email ? `Sign out (${email})` : "Sign out"}
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
