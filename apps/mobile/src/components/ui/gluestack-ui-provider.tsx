import React from "react";
import { View } from "react-native";
import { themeVars } from "../../lib/theme/vars";

interface GluestackUIProviderProps {
  mode?: "light" | "dark";
  children: React.ReactNode;
}

/**
 * Minimal Gluestack UI v2 provider — wraps app for theming context. Sets the
 * CSS custom properties (see src/lib/theme/vars.ts) that mode-dependent
 * Tailwind tokens like `bg-background` resolve through, so descendants don't
 * need a paired `dark:` class.
 */
export function GluestackUIProvider({ mode = "light", children }: GluestackUIProviderProps) {
  return (
    <View style={themeVars[mode]} className="flex-1 bg-background">
      {children}
    </View>
  );
}
