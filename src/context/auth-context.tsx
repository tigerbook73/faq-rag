"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface AuthContextValue {
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue>({ isAuthenticated: false });

export function AuthContextProvider({ children, initialAuth }: { children: ReactNode; initialAuth: boolean }) {
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ isAuthenticated }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
