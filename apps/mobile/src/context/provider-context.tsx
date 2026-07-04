import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { Provider } from "../lib/api/chat";
import { getStoredProvider, setStoredProvider } from "../lib/api/storage";

// Mirrors apps/web/src/lib/server/llm/providers.ts's PROVIDER_LABEL; keep in
// sync manually (mobile cannot import from an app package).
export const PROVIDERS: Provider[] = ["claude", "deepseek", "openai"];
export const PROVIDER_LABEL: Record<Provider, string> = {
  claude: "Claude",
  deepseek: "DeepSeek",
  openai: "OpenAI",
};

const DEFAULT_PROVIDER: Provider = (process.env.EXPO_PUBLIC_DEFAULT_PROVIDER as Provider | undefined) ?? "claude";

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
