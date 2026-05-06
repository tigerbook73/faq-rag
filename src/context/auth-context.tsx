"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface AuthContextValue {
  isAuthenticated: boolean;
  role: "user" | "admin" | null;
}

const AuthContext = createContext<AuthContextValue>({ isAuthenticated: false, role: null });

export function AuthContextProvider({
  children,
  initialAuth,
  initialRole,
}: {
  children: ReactNode;
  initialAuth: boolean;
  initialRole: "user" | "admin" | null;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth);
  const [role, setRole] = useState<"user" | "admin" | null>(initialRole);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
      if (!session) setRole(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ isAuthenticated, role }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
