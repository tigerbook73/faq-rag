import type { ReactNode } from "react";
import { Pressable, Text, View, type PressableProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

interface ListItemProps extends Omit<PressableProps, "children"> {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  trailing?: ReactNode;
}

export function ListItem({ icon, label, trailing, className, ...props }: ListItemProps) {
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === "dark" ? "#e5e7eb" : "#1f2937";

  return (
    <Pressable
      className={`flex-row items-center gap-3 px-4 py-3 active:bg-gray-100 dark:active:bg-gray-800 ${className ?? ""}`}
      {...props}
    >
      <Ionicons name={icon} size={20} color={iconColor} />
      <Text className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">{label}</Text>
      {trailing ? <View>{trailing}</View> : null}
    </Pressable>
  );
}
