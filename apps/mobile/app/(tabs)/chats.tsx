import { View, Text, FlatList, Pressable } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Button } from "../../src/components/ui/button";
import { useChatSessions } from "../../src/hooks/useChatSessions";
import { relativeDate } from "../../src/lib/utils/relative-date";
import type { ChatSession } from "../../src/lib/api/session";

function DeleteAction({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="w-20 items-center justify-center bg-red-600">
      <Text className="font-medium text-white">Delete</Text>
    </Pressable>
  );
}

function SessionRow({
  session,
  onPress,
  onDelete,
}: {
  session: ChatSession;
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <Swipeable renderRightActions={() => <DeleteAction onPress={onDelete} />}>
      <Pressable
        onPress={onPress}
        className="border-b border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950"
      >
        <Text className="text-base font-medium text-gray-900 dark:text-gray-100" numberOfLines={1}>
          {session.title || "New chat"}
        </Text>
        <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{relativeDate(session.updatedAt)}</Text>
      </Pressable>
    </Swipeable>
  );
}

export default function ChatsScreen() {
  const { sessions, isLoading, handleNew, handleDelete, navigateToSession } = useChatSessions();

  return (
    <View className="flex-1 bg-white dark:bg-gray-950">
      <View className="flex-row items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <Text className="text-lg font-semibold text-gray-800 dark:text-gray-200">Chats</Text>
        <Button size="sm" onPress={() => void handleNew()}>
          + New Chat
        </Button>
      </View>

      {!isLoading && sessions.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-4">
          <Text className="text-sm text-gray-500 dark:text-gray-400">No chats yet</Text>
          <Button onPress={() => void handleNew()}>New Chat</Button>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => (
            <SessionRow
              session={item}
              onPress={() => navigateToSession(item.id)}
              onDelete={() => void handleDelete(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}
