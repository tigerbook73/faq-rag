"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { LibraryBig, Sun, Moon, LogOut, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getLastChatHref } from "@/lib/last-chat";

export function AdminTopBar({ email }: { email: string | null }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/auth/signin");
  }

  return (
    <header className="bg-background flex h-12 shrink-0 items-center justify-between border-b px-3 sm:px-4">
      <div className="flex items-center gap-2">
        <LibraryBig className="size-6 shrink-0" />
        <span className="text-base font-bold">FAQ-RAG Admin</span>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <Button variant="outline" size="sm" onClick={() => router.push(getLastChatHref())}>
          <ArrowLeft className="h-4 w-4" />
          Back to FAQ
        </Button>
        <Separator orientation="vertical" className="my-2 self-stretch" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="hidden h-4 w-4 dark:block" />
        </Button>
        {email && (
          <span className="text-muted-foreground hidden text-sm sm:inline">{email}</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          title={email ? `Sign out (${email})` : "Sign out"}
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
