import { useState } from "react";
import { Modal, Pressable, Text, TextInput, View, KeyboardAvoidingView, Platform } from "react-native";
import { useColorScheme } from "nativewind";

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
  const { colorScheme } = useColorScheme();
  const [title, setTitle] = useState(initialTitle);

  const handleSave = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onSave(trimmed);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
          <Pressable
            className="rounded-t-2xl bg-white px-5 pb-8 pt-4 dark:bg-gray-900"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Rename chat</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              autoFocus
              placeholderTextColor={colorScheme === "dark" ? "#6b7280" : "#9ca3af"}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:text-gray-100"
              onSubmitEditing={handleSave}
              returnKeyType="done"
            />
            <View className="mt-4 flex-row justify-end gap-5">
              <Pressable onPress={onClose}>
                <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSave}>
                <Text className="text-sm font-semibold text-blue-600 dark:text-blue-400">Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
