import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { DrawerContentScrollView, type DrawerContentComponentProps } from "expo-router/drawer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useChatSessions } from "../../hooks/useChatSessions";
import { ListItem } from "../ui/list-item";
import { SessionRow } from "./SessionRow";

export function ChatDrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sessions, isLoading, handleNew, handleDelete, navigateToSession } = useChatSessions();

  const closeAndRun = (fn: () => void) => () => {
    props.navigation.closeDrawer();
    fn();
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top }}>
      <ListItem icon="create-outline" label="New Chat" onPress={closeAndRun(() => void handleNew())} />
      <View className="my-2 border-t border-gray-100 dark:border-gray-800" />

      {sessions.map((session) => (
        <SessionRow
          key={session.id}
          session={session}
          onPress={closeAndRun(() => navigateToSession(session.id))}
          onDelete={() => void handleDelete(session.id)}
        />
      ))}
      {!isLoading && sessions.length === 0 && (
        <Text className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">No chats yet</Text>
      )}

      <View style={{ flexGrow: 1 }} />

      <View
        className="border-t border-gray-100 dark:border-gray-800"
        style={{ paddingBottom: Math.max(insets.bottom, 8) }}
      >
        <ListItem icon="library-outline" label="Knowledge" onPress={closeAndRun(() => router.push("/knowledge"))} />
        <ListItem icon="information-circle-outline" label="About" onPress={closeAndRun(() => router.push("/about"))} />
      </View>
    </DrawerContentScrollView>
  );
}
