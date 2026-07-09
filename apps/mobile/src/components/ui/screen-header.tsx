import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ScreenHeaderProps {
  children: ReactNode;
  className?: string;
}

// Single source of truth for the height-determining styles (top/bottom
// padding, border) shared by every screen header — ChatScreen, About,
// Knowledge, and the drawer panel's own header — so they can't drift apart
// independently the way About/Knowledge once did.
export function ScreenHeader({ children, className = "px-1" }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={`flex-row items-center border-b border-border-muted ${className}`}
      style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
    >
      {children}
    </View>
  );
}
