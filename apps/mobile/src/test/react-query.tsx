import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, type RenderHookOptions, type RenderHookResult } from "@testing-library/react-native";

/** Retry/GC/focus-refetch are all off so fake timers in a test only ever advance that test's own timers. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, refetchOnWindowFocus: false, refetchOnReconnect: false },
      mutations: { retry: false },
    },
  });
}

export function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

/** renderHook pre-wired with a QueryClientProvider; returns the client for setQueryData/getQueryData assertions. */
export function renderHookWithClient<TResult, TProps>(
  hook: (props: TProps) => TResult,
  options?: RenderHookOptions<TProps> & { client?: QueryClient },
): RenderHookResult<TResult, TProps> & { client: QueryClient } {
  const client = options?.client ?? createTestQueryClient();
  const result = renderHook(hook, { ...options, wrapper: createWrapper(client) });
  return { ...result, client };
}
