import { Pressable, Text } from "react-native";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { relativeDate } from "../../lib/utils/relative-date";
import type { ChatSession } from "../../lib/api/session";

function DeleteAction({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="w-20 items-center justify-center bg-red-600">
      <Text className="font-medium text-white">Delete</Text>
    </Pressable>
  );
}

export function SessionRow({
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
