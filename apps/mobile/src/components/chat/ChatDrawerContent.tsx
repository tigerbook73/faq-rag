import { useCallback, useState } from "react";
import { View, Text, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { DrawerContentScrollView, type DrawerContentComponentProps } from "expo-router/drawer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { Ionicons } from "@expo/vector-icons";
import { useChatSessions } from "../../hooks/useChatSessions";
import type { ChatSession } from "../../lib/api/session";
import { ListItem } from "../ui/list-item";
import { IconButton } from "../ui/icon-button";
import { ScreenHeader } from "../ui/screen-header";
import { ActionSheet } from "../ui/action-sheet";
import { SessionRow } from "./SessionRow";
import { RenameSessionDialog } from "./RenameSessionDialog";

export function ChatDrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const { sessions, isLoading, handleNew, handleDelete, handleRename, handleDeleteAll, navigateToSession, refresh } =
    useChatSessions();

  const [actionSession, setActionSession] = useState<ChatSession | null>(null);
  const [renameSession, setRenameSession] = useState<ChatSession | null>(null);
  const [clearAllVisible, setClearAllVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const closeAndRun = (fn: () => void) => () => {
    props.navigation.closeDrawer();
    fn();
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader className="justify-between px-4">
        <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">FAQ RAG</Text>
        <IconButton icon="close" onPress={() => props.navigation.closeDrawer()} accessibilityLabel="Close menu" />
      </ScreenHeader>

      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={colorScheme === "dark" ? "#e5e7eb" : "#1f2937"}
          />
        }
      >
        <ListItem icon="library-outline" label="Knowledge" onPress={closeAndRun(() => router.push("/knowledge"))} />
        <ListItem icon="information-circle-outline" label="About" onPress={closeAndRun(() => router.push("/about"))} />
        <View className="my-2 border-t border-gray-100 dark:border-gray-800" />

        <View className="flex-row items-center justify-between px-4 pb-1 pt-2">
          <Text className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">Recent</Text>
          {sessions.length > 0 && (
            <IconButton
              icon="trash-outline"
              size={18}
              onPress={() => setClearAllVisible(true)}
              accessibilityLabel="Clear all chats"
            />
          )}
        </View>

        {sessions.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            onPress={closeAndRun(() => navigateToSession(session.id))}
            onLongPress={() => setActionSession(session)}
          />
        ))}
        {!isLoading && sessions.length === 0 && (
          <Text className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">No chats yet</Text>
        )}
      </DrawerContentScrollView>

      <View
        className="items-start border-t border-gray-100 px-4 pt-3 dark:border-gray-800"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <Pressable
          onPress={closeAndRun(() => void handleNew())}
          className="flex-row items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 active:bg-blue-700"
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text className="text-sm font-semibold text-white">New Chat</Text>
        </Pressable>
      </View>

      <ActionSheet
        visible={actionSession !== null}
        onClose={() => setActionSession(null)}
        actions={[
          {
            key: "rename",
            label: "Rename",
            icon: "pencil-outline",
            onPress: () => {
              const s = actionSession;
              setActionSession(null);
              if (s) setRenameSession(s);
            },
          },
          {
            key: "delete",
            label: "Delete",
            icon: "trash-outline",
            destructive: true,
            onPress: () => {
              if (actionSession) void handleDelete(actionSession.id);
              setActionSession(null);
            },
          },
        ]}
      />

      <RenameSessionDialog
        key={renameSession?.id ?? "none"}
        visible={renameSession !== null}
        initialTitle={renameSession?.title ?? ""}
        onSave={(title) => {
          if (renameSession) void handleRename(renameSession.id, title);
          setRenameSession(null);
        }}
        onClose={() => setRenameSession(null)}
      />

      <ActionSheet
        visible={clearAllVisible}
        onClose={() => setClearAllVisible(false)}
        title="Clear all chats?"
        description="This will delete all chat history. This can't be undone."
        actions={[
          {
            key: "clear",
            label: "Clear All",
            destructive: true,
            onPress: () => {
              setClearAllVisible(false);
              props.navigation.closeDrawer();
              void handleDeleteAll();
            },
          },
          { key: "cancel", label: "Cancel", onPress: () => setClearAllVisible(false) },
        ]}
      />
    </View>
  );
}
