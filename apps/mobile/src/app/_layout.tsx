import "../../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useColorScheme } from "nativewind";
import { LogBox } from "react-native";
import { useThemeColors } from "../hooks/useThemeColors";
import { AppProviders } from "../providers/app-providers";

LogBox.ignoreLogs(["InteractionManager has been deprecated"]);

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
