import type { ReactNode } from "react";
import { Pressable, Text, View, type PressableProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/hooks/useThemeColors";

interface ListItemProps extends Omit<PressableProps, "children"> {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  trailing?: ReactNode;
}

export function ListItem({ icon, label, trailing, className, ...props }: ListItemProps) {
  const colors = useThemeColors();

  return (
    <Pressable className={`flex-row items-center gap-3 px-4 py-3 active:bg-muted ${className ?? ""}`} {...props}>
      <Ionicons name={icon} size={20} color={colors.icon} />
      <Text className="flex-1 text-sm font-medium text-foreground">{label}</Text>
      {trailing ? <View>{trailing}</View> : null}
    </Pressable>
  );
}
