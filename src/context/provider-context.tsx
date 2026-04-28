"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { PROVIDER, type Provider } from "@/src/lib/llm/providers";

interface ProviderContextValue {
  provider: Provider;
  setProvider: (p: Provider) => void;
}

const ProviderContext = createContext<ProviderContextValue>({
  provider: PROVIDER.DEEPSEEK,
  setProvider: () => {},
});

export function ProviderContextProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProviderState] = useState<Provider>(PROVIDER.DEEPSEEK);
  const setProvider = useCallback((p: Provider) => setProviderState(p), []);
  return <ProviderContext.Provider value={{ provider, setProvider }}>{children}</ProviderContext.Provider>;
}

export function useProvider() {
  return useContext(ProviderContext);
}
