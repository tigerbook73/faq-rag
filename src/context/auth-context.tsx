"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface AuthContextValue {
  isAuthenticated: boolean;
  role: "user" | "admin" | null;
  email: string | null;
}

const AuthContext = createContext<AuthContextValue>({ isAuthenticated: false, role: null, email: null });

export function AuthContextProvider({
  children,
  initialAuth,
  initialRole,
  initialEmail,
}: {
  children: ReactNode;
  initialAuth: boolean;
  initialRole: "user" | "admin" | null;
  initialEmail: string | null;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth);
  const [role, setRole] = useState<"user" | "admin" | null>(initialRole);
  const [email, setEmail] = useState<string | null>(initialEmail);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
      if (!session) {
        setRole(null);
        setEmail(null);
      } else {
        setEmail(session.user.email ?? null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ isAuthenticated, role, email }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
