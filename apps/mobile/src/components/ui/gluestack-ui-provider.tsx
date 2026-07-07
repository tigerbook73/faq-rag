import React from "react";
import { View } from "react-native";

interface GluestackUIProviderProps {
  mode?: "light" | "dark";
  children: React.ReactNode;
}

/** Minimal Gluestack UI v2 provider — wraps app for theming context. */
export function GluestackUIProvider({ children }: GluestackUIProviderProps) {
  return <View className="flex-1 bg-white dark:bg-gray-950">{children}</View>;
}
