import { Modal, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useThemeVars } from "@/hooks/useThemeVars";

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
  const colors = useThemeColors();
  const vars = useThemeVars();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Modal content is portaled outside the DOM subtree that carries our
          CSS-variable tokens on react-native-web, so re-apply them here. */}
      <Pressable style={vars} className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="rounded-t-2xl bg-card pb-8 pt-2" onPress={(e) => e.stopPropagation()}>
          {(title ?? description) && (
            <Pressable className="px-5 py-3" onPress={(e) => e.stopPropagation()}>
              {title && (
                <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                  {title}
                </Text>
              )}
              {description && <Text className="mt-1 text-xs text-muted-foreground">{description}</Text>}
            </Pressable>
          )}
          {actions.map((action) => (
            <Pressable
              key={action.key}
              className="flex-row items-center gap-3 px-5 py-3.5 active:bg-pressed"
              onPress={action.onPress}
            >
              {action.icon && (
                <Ionicons name={action.icon} size={18} color={action.destructive ? colors.destructive : colors.icon} />
              )}
              <Text className={`text-base ${action.destructive ? "text-destructive" : "text-foreground"}`}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
