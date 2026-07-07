import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { ChatRequestInputSchema, PROVIDER_LABEL, DEFAULT_PROVIDER as SHARED_DEFAULT_PROVIDER } from "@faq-rag/shared";
import type { Provider } from "../lib/api/chat";
import { getStoredProvider, setStoredProvider } from "../lib/api/storage";

// Derived from the shared schema enum so the runtime list cannot drift from
// the API contract.
export const PROVIDERS: readonly Provider[] = ChatRequestInputSchema.shape.provider.unwrap().options;
export { PROVIDER_LABEL };

const DEFAULT_PROVIDER: Provider =
  (process.env.EXPO_PUBLIC_DEFAULT_PROVIDER as Provider | undefined) ?? SHARED_DEFAULT_PROVIDER;

interface ProviderContextValue {
  provider: Provider;
  setProvider: (p: Provider) => void;
}

const ProviderContext = createContext<ProviderContextValue>({
  provider: DEFAULT_PROVIDER,
  setProvider: () => {},
});

export function ProviderContextProvider({ children }: { children: ReactNode }) {
  const [provider, setProviderState] = useState<Provider>(DEFAULT_PROVIDER);

  useEffect(() => {
    void getStoredProvider().then((stored) => {
      if (stored && PROVIDERS.includes(stored)) setProviderState(stored);
    });
  }, []);

  const setProvider = useCallback((p: Provider) => {
    setProviderState(p);
    void setStoredProvider(p);
  }, []);

  return <ProviderContext.Provider value={{ provider, setProvider }}>{children}</ProviderContext.Provider>;
}

export function useProvider() {
  return useContext(ProviderContext);
}
