"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { PROVIDER, type Provider } from "@/lib/llm/providers";

interface ProviderContextValue {
  provider: Provider;
  setProvider: (p: Provider) => void;
}

const ProviderContext = createContext<ProviderContextValue>({
  provider: PROVIDER.DEEPSEEK,
  setProvider: () => {},
});

const defaultProvider = (process.env.NEXT_PUBLIC_DEFAULT_PROVIDER as Provider | undefined) ?? PROVIDER.DEEPSEEK;

export function ProviderContextProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProviderState] = useState<Provider>(defaultProvider);
  const setProvider = useCallback((p: Provider) => setProviderState(p), []);
  return <ProviderContext.Provider value={{ provider, setProvider }}>{children}</ProviderContext.Provider>;
}

export function useProvider() {
  return useContext(ProviderContext);
}
