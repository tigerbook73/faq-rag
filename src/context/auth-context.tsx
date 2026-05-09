"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AuthMeResponseSchema } from "@/lib/schemas/user";

interface AuthContextValue {
  isAuthenticated: boolean;
  role: "user" | "admin" | null;
  email: string | null;
  id: string | null;
  isAuthLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  role: null,
  email: null,
  id: null,
  isAuthLoading: true,
});

export function AuthContextProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<"user" | "admin" | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [id, setId] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function fetchRole() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const parsed = AuthMeResponseSchema.safeParse(await res.json());
          if (parsed.success) {
            setRole(parsed.data.role);
            setId(parsed.data.id);
          }
        }
      } finally {
        setIsAuthLoading(false);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) {
        setIsAuthenticated(true);
        setEmail(session.user.email ?? null);
        fetchRole();
      } else {
        setIsAuthenticated(false);
        setRole(null);
        setEmail(null);
        setId(null);
        setIsAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, role, email, id, isAuthLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
