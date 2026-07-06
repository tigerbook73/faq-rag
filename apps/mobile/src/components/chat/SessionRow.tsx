import { memo } from "react";
import { Pressable, Text } from "react-native";
import type { ChatSession } from "../../lib/api/session";

export const SessionRow = memo(function SessionRow({
  session,
  onPress,
  onLongPress,
}: {
  session: ChatSession;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      className="border-b border-gray-100 bg-white px-4 py-2.5 active:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:active:bg-gray-900"
    >
      <Text className="text-base font-medium text-gray-900 dark:text-gray-100" numberOfLines={1}>
        {session.title || "New chat"}
      </Text>
    </Pressable>
  );
});
