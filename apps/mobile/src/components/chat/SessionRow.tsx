import { memo } from "react";
import { Pressable, Text } from "react-native";
import type { ChatSession } from "@/lib/api/session";

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
      className="border-b border-border-muted bg-card px-4 py-2.5 active:bg-pressed"
    >
      <Text className="text-base font-medium text-foreground" numberOfLines={1}>
        {session.title || "New chat"}
      </Text>
    </Pressable>
  );
});
