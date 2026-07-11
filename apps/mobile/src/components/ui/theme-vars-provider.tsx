import React from "react";
import { View } from "react-native";
import { themeVars } from "@/lib/theme/vars";

interface ThemeVarsProviderProps {
  mode?: "light" | "dark";
  children: React.ReactNode;
}

/**
 * Applies the CSS custom properties (see src/lib/theme/vars.ts) that
 * mode-dependent Tailwind tokens like `bg-background` resolve through, so
 * descendants don't need paired `dark:` classes.
 */
export function ThemeVarsProvider({ mode = "light", children }: ThemeVarsProviderProps) {
  return (
    <View style={themeVars[mode]} className="flex-1 bg-background">
      {children}
    </View>
  );
}
