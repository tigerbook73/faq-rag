import { QueryClient } from "@tanstack/react-query";

// No defaultOptions here — mirrors the previous "no global SWRConfig" setup,
// each hook declares the options it needs at the call site.
export const queryClient = new QueryClient();
