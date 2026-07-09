import { useState } from "react";
import { Modal, Pressable, Text, TextInput, View, KeyboardAvoidingView, Platform } from "react-native";
import { useThemeColors } from "../../hooks/useThemeColors";
import { useThemeVars } from "../../hooks/useThemeVars";

interface Props {
  visible: boolean;
  initialTitle: string;
  onSave: (title: string) => void;
  onClose: () => void;
}

// Bottom-sheet Modal, same chrome as ActionSheet. Wrapped in
// KeyboardAvoidingView (mirroring ChatScreen.tsx's composer) so the keyboard
// doesn't cover the input on iOS.
//
// The caller must remount this (e.g. via a `key` keyed on the session id)
// whenever a different session's rename is opened — `initialTitle` only
// seeds state on mount, it isn't resynced on prop changes.
export function RenameSessionDialog({ visible, initialTitle, onSave, onClose }: Props) {
  const colors = useThemeColors();
  const vars = useThemeVars();
  const [title, setTitle] = useState(initialTitle);

  const handleSave = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onSave(trimmed);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Modal content is portaled outside the DOM subtree that carries our
          CSS-variable tokens on react-native-web, so re-apply them here. */}
      <KeyboardAvoidingView style={vars} className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
          <Pressable className="rounded-t-2xl bg-card px-5 pb-8 pt-4" onPress={(e) => e.stopPropagation()}>
            <Text className="mb-3 text-sm font-semibold text-foreground">Rename chat</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              autoFocus
              placeholderTextColor={colors.mutedForeground}
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
              onSubmitEditing={handleSave}
              returnKeyType="done"
            />
            <View className="mt-4 flex-row justify-end gap-5">
              <Pressable onPress={onClose}>
                <Text className="text-sm font-medium text-muted-foreground">Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSave}>
                <Text className="text-sm font-semibold text-primary-text">Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
