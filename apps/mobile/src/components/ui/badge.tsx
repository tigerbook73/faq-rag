import { Text, View } from "react-native";

type BadgeTone = "success" | "info" | "danger" | "neutral";

const TONE_STYLE: Record<BadgeTone, { badge: string; text: string }> = {
  success: { badge: "bg-green-100 dark:bg-green-950", text: "text-green-700 dark:text-green-400" },
  info: { badge: "bg-blue-100 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-400" },
  danger: { badge: "bg-red-100 dark:bg-red-950", text: "text-red-700 dark:text-red-400" },
  neutral: { badge: "bg-gray-100 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-300" },
};

interface BadgeProps {
  tone: BadgeTone;
  children: string;
}

export function Badge({ tone, children }: BadgeProps) {
  const s = TONE_STYLE[tone];
  return (
    <View className={`rounded-full px-2 py-0.5 ${s.badge}`}>
      <Text className={`text-xs font-medium ${s.text}`}>{children}</Text>
    </View>
  );
}
