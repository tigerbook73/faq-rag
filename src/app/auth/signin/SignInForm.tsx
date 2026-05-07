"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { lastChat } from "@/lib/last-chat";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";

const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@test.com", password: "admin@123" },
  { label: "User 1", email: "user1@test.com", password: "user1@123" },
  { label: "User 2", email: "user2@test.com", password: "user2@123" },
];

export function SignInForm() {
  const router = useRouter();
  const explicitFrom = useSearchParams().get("from");
  const [email, setEmail] = useState("admin@test.com");
  const [password, setPassword] = useState("admin@123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    lastChat.clear();
  }, []);

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setPending(false);
      return;
    }

    if (explicitFrom) {
      router.refresh();
      router.replace(explicitFrom);
      return;
    }

    // No explicit redirect target — check business role to determine landing page
    try {
      const res = await fetch("/api/auth/me");
      const profile = await res.json().catch(() => ({}));
      router.refresh();
      router.replace(profile.role === "admin" ? "/admin" : "/chat/new");
    } catch {
      router.refresh();
      router.replace("/chat/new");
    }
  }

  return (
    <div className="bg-background flex h-full items-center justify-center p-4">
      <Card className="w-full max-w-(--container-app-form)">
        <CardHeader className="space-y-1">
          <CardTitle className="text-app-title text-center">FAQ RAG</CardTitle>
          <p className="text-muted-foreground text-center text-sm">Sign in to continue</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={pending}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <InputGroup className="h-9">
                <InputGroupInput
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={pending}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton tabIndex={-1} onClick={() => setShowPassword((v) => !v)}>
                    {showPassword ? <EyeOff /> : <Eye />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <div className="mt-6 space-y-2">
            <p className="text-app-caption text-muted-foreground">Demo accounts</p>
            <div className="grid gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <Button
                  key={account.email}
                  type="button"
                  variant="outline"
                  className="h-auto justify-between gap-3 py-2"
                  disabled={pending}
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                  }}
                >
                  <span>{account.label}</span>
                  <span className="text-muted-foreground truncate font-mono text-xs">
                    {account.email} / {account.password}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
