import "../../global.css";
import { useEffect } from "react";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useColorScheme } from "nativewind";
import { Appearance, LogBox, Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { useThemeColors } from "@/hooks/useThemeColors";
import { logger } from "@/lib/logger";
import { dark, light } from "@/lib/theme/colors";
import { AppProviders } from "@/providers/app-providers";

LogBox.ignoreLogs(["InteractionManager has been deprecated"]);

// expo-router renders this above RootLayout/AppProviders (see its `Try`
// wrapper), so it can catch errors even from RootLayout's own hooks — but
// ThemeVarsProvider's CSS vars may not exist yet, so colors come from
// colors.js + Appearance directly instead of useThemeColors()/bg-background.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    logger.error("Uncaught render error:", error);
  }, [error]);

  const colors = Appearance.getColorScheme() === "dark" ? dark : light;
  return (
    <View style={{ backgroundColor: colors.background }} className="flex-1 items-center justify-center px-6">
      <Text style={{ color: colors.foreground }} className="mb-2 text-center text-lg font-semibold">
        Something went wrong
      </Text>
      {__DEV__ && (
        <Text style={{ color: colors.mutedForeground }} className="mb-6 text-center text-sm">
          {error.message}
        </Text>
      )}
      <Button variant="solid" onPress={() => void retry()}>
        Try again
      </Button>
    </View>
  );
}

export default function RootLayout() {
  // NativeWind defaults to the system color scheme; dark: variants and the
  // navigation theme both key off it so the whole app switches together.
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = useThemeColors();

  // The native root view (what shows through the translucent status bar and
  // the bottom "chin"/home-indicator area) has its own background, separate
  // from any RN view — without this it stays the OS default white regardless
  // of app theme. Matches the drawer's dark-mode colors in (drawer)/_layout.tsx.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  return (
    <AppProviders isDark={isDark}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
      <StatusBar style="auto" />
    </AppProviders>
  );
}
