import { Pressable, type PressableProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

interface IconButtonProps extends Omit<PressableProps, "children"> {
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
}

// Ionicons' color prop isn't a NativeWind className, so it needs a manual
// light/dark default here — the same pattern CitationSheet.tsx uses for
// third-party components that don't accept Tailwind classes.
export function IconButton({ icon, size = 22, color, className, ...props }: IconButtonProps) {
  const { colorScheme } = useColorScheme();
  const resolvedColor = color ?? (colorScheme === "dark" ? "#e5e7eb" : "#1f2937");

  return (
    <Pressable
      className={`h-10 w-10 items-center justify-center rounded-full active:bg-gray-100 dark:active:bg-gray-800 ${className ?? ""}`}
      hitSlop={8}
      {...props}
    >
      <Ionicons name={icon} size={size} color={resolvedColor} />
    </Pressable>
  );
}
