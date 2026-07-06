import { Modal, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

export interface ActionSheetAction {
  key: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  actions: ActionSheetAction[];
}

// Generic bottom-sheet action menu, mirroring app/knowledge.tsx's
// DocumentActionSheet chrome (plain Modal, not @gorhom/bottom-sheet — that's
// reserved for CitationSheet's larger scrollable content). Rows call
// action.onPress() themselves; this component doesn't auto-close so callers
// can sequence follow-up UI (e.g. opening another modal) explicitly.
export function ActionSheet({ visible, onClose, title, description, actions }: ActionSheetProps) {
  const { colorScheme } = useColorScheme();
  const normalColor = colorScheme === "dark" ? "#e5e7eb" : "#1f2937";
  const destructiveColor = colorScheme === "dark" ? "#f87171" : "#dc2626";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="rounded-t-2xl bg-white pb-8 pt-2 dark:bg-gray-900" onPress={(e) => e.stopPropagation()}>
          {(title ?? description) && (
            <Pressable className="px-5 py-3" onPress={(e) => e.stopPropagation()}>
              {title && (
                <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100" numberOfLines={1}>
                  {title}
                </Text>
              )}
              {description && <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</Text>}
            </Pressable>
          )}
          {actions.map((action) => (
            <Pressable
              key={action.key}
              className="flex-row items-center gap-3 px-5 py-3.5 active:bg-gray-50 dark:active:bg-gray-800"
              onPress={action.onPress}
            >
              {action.icon && (
                <Ionicons name={action.icon} size={18} color={action.destructive ? destructiveColor : normalColor} />
              )}
              <Text
                className={`text-base ${action.destructive ? "text-red-600 dark:text-red-400" : "text-gray-800 dark:text-gray-200"}`}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
