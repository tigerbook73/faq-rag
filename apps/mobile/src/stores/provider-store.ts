import { create } from "zustand";
import { ChatRequestInputSchema, PROVIDER_LABEL, DEFAULT_PROVIDER as SHARED_DEFAULT_PROVIDER } from "@faq-rag/shared";
import type { Provider } from "../lib/api/chat";
import { getStoredProvider, setStoredProvider } from "../lib/api/storage";

// Derived from the shared schema enum so the runtime list cannot drift from
// the API contract.
export const PROVIDERS: readonly Provider[] = ChatRequestInputSchema.shape.provider.unwrap().options;
export { PROVIDER_LABEL };

const DEFAULT_PROVIDER: Provider =
  (process.env.EXPO_PUBLIC_DEFAULT_PROVIDER as Provider | undefined) ?? SHARED_DEFAULT_PROVIDER;

interface ProviderState {
  hydrated: boolean;
  provider: Provider;
  hydrateProvider: () => Promise<void>;
  setProvider: (provider: Provider) => void;
}

export const useProviderStore = create<ProviderState>((set, get) => ({
  hydrated: false,
  provider: DEFAULT_PROVIDER,
  hydrateProvider: async () => {
    if (get().hydrated) return;

    const stored = await getStoredProvider();
    if (get().hydrated) return;

    set({
      hydrated: true,
      provider: stored && PROVIDERS.includes(stored) ? stored : DEFAULT_PROVIDER,
    });
  },
  setProvider: (provider) => {
    set({ hydrated: true, provider });
    void setStoredProvider(provider);
  },
}));
