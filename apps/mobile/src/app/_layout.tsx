import "../../global.css";
import { useEffect } from "react";
import { Stack, ThemeProvider, DarkTheme, DefaultTheme } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useColorScheme } from "nativewind";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GluestackUIProvider } from "../components/ui/gluestack-ui-provider";
import { ProviderContextProvider } from "../context/provider-context";

export default function RootLayout() {
  // NativeWind defaults to the system color scheme; dark: variants and the
  // navigation theme both key off it so the whole app switches together.
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // The native root view (what shows through the translucent status bar and
  // the bottom "chin"/home-indicator area) has its own background, separate
  // from any RN view — without this it stays the OS default white regardless
  // of app theme. Matches the drawer's dark-mode colors in (drawer)/_layout.tsx.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(isDark ? "#030712" : "#ffffff");
  }, [isDark]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
          <GluestackUIProvider mode={isDark ? "dark" : "light"}>
            <ProviderContextProvider>
              <BottomSheetModalProvider>
                <Stack screenOptions={{ headerShown: false }} />
              </BottomSheetModalProvider>
            </ProviderContextProvider>
          </GluestackUIProvider>
        </ThemeProvider>
        <StatusBar style="auto" />
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
