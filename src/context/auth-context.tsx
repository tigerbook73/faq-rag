"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
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

export type InitialAuthState = Pick<AuthContextValue, "isAuthenticated" | "role" | "email" | "id">;

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  role: null,
  email: null,
  id: null,
  isAuthLoading: true,
});

const ANONYMOUS_AUTH_STATE: InitialAuthState = {
  isAuthenticated: false,
  role: null,
  email: null,
  id: null,
};

export function AuthContextProvider({
  children,
  initialAuthState = ANONYMOUS_AUTH_STATE,
}: {
  children: ReactNode;
  initialAuthState?: InitialAuthState;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuthState.isAuthenticated);
  const [role, setRole] = useState<"user" | "admin" | null>(initialAuthState.role);
  const [email, setEmail] = useState<string | null>(initialAuthState.email);
  const [id, setId] = useState<string | null>(initialAuthState.id);
  const [isAuthLoading, setIsAuthLoading] = useState(initialAuthState.isAuthenticated && !initialAuthState.role);
  const authRequestIdRef = useRef(0);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function fetchRole(requestId: number) {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const parsed = AuthMeResponseSchema.safeParse(await res.json());
          if (parsed.success && requestId === authRequestIdRef.current) {
            setRole(parsed.data.role);
            setId(parsed.data.id);
            setEmail(parsed.data.email);
          }
        }
      } finally {
        if (requestId === authRequestIdRef.current) {
          setIsAuthLoading(false);
        }
      }
    }

    async function applySession(session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) {
      const requestId = authRequestIdRef.current + 1;
      authRequestIdRef.current = requestId;

      if (session) {
        setIsAuthenticated(true);
        setEmail(session.user.email ?? null);
        setIsAuthLoading(true);
        await fetchRole(requestId);
      } else {
        setIsAuthenticated(false);
        setRole(null);
        setEmail(null);
        setId(null);
        setIsAuthLoading(false);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      void applySession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, role, email, id, isAuthLoading }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
