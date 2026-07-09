import { Modal, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Provider } from "../../lib/api/chat";
import { PROVIDERS, PROVIDER_LABEL } from "../../context/provider-context";
import { useThemeColors } from "../../hooks/useThemeColors";
import { useThemeVars } from "../../hooks/useThemeVars";

interface Props {
  visible: boolean;
  current: Provider;
  onSelect: (p: Provider) => void;
  onClose: () => void;
}

/** Bottom-anchored action sheet for switching the LLM provider. */
export function ProviderSheet({ visible, current, onSelect, onClose }: Props) {
  const colors = useThemeColors();
  const vars = useThemeVars();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Modal content is portaled outside the DOM subtree that carries our
          CSS-variable tokens on react-native-web, so re-apply them here. */}
      <Pressable style={vars} className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="rounded-t-2xl bg-card pb-8 pt-2" onPress={(e) => e.stopPropagation()}>
          <Text className="px-5 py-3 text-xs font-medium uppercase text-subtle-foreground">LLM Provider</Text>
          {PROVIDERS.map((p) => (
            <Pressable
              key={p}
              className="flex-row items-center justify-between px-5 py-3.5 active:bg-pressed"
              onPress={() => {
                onSelect(p);
                onClose();
              }}
            >
              <Text className={`text-base ${p === current ? "font-semibold text-primary-text" : "text-foreground"}`}>
                {PROVIDER_LABEL[p]}
              </Text>
              {p === current && <Ionicons name="checkmark" size={18} color={colors.primaryText} />}
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
