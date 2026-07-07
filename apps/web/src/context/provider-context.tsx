"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { Provider } from "@faq-rag/shared";
import { config } from "@/lib/shared/config";

interface ProviderContextValue {
  provider: Provider;
  setProvider: (p: Provider) => void;
}

const ProviderContext = createContext<ProviderContextValue>({
  provider: config.llm.defaultProvider,
  setProvider: () => {},
});

export function ProviderContextProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProviderState] = useState<Provider>(config.llm.defaultProvider);
  const setProvider = useCallback((p: Provider) => setProviderState(p), []);
  return <ProviderContext.Provider value={{ provider, setProvider }}>{children}</ProviderContext.Provider>;
}

export function useProvider() {
  return useContext(ProviderContext);
}
