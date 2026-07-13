import { useEffect, type ReactNode } from "react";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { ThemeVarsProvider } from "@/components/ui/theme-vars-provider";
import { queryClient } from "@/lib/query-client";
import { useProviderStore } from "@/stores/provider-store";

interface AppProvidersProps {
  children: ReactNode;
  isDark: boolean;
}

export function AppProviders({ children, isDark }: AppProvidersProps) {
  const hydrateProvider = useProviderStore((state) => state.hydrateProvider);

  useEffect(() => {
    void hydrateProvider();
  }, [hydrateProvider]);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
            <ThemeVarsProvider mode={isDark ? "dark" : "light"}>
              <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
            </ThemeVarsProvider>
          </ThemeProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
