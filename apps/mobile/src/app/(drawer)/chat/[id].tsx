import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import type { DrawerNavigationProp } from "expo-router/drawer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { getSession, type ChatSession } from "@/lib/api/session";
import { queryKeys } from "@/lib/query-keys";
import { IconButton } from "@/components/ui/icon-button";
import { LoadedChatScreen } from "@/components/chat/ChatScreen";

type ChatDrawerNavigation = DrawerNavigationProp<Record<string, object | undefined>>;

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation<ChatDrawerNavigation>();
  const insets = useSafeAreaInsets();

  const { data: sessionData, isLoading: isSessionLoading } = useQuery<ChatSession | null>({
    queryKey: queryKeys.sessions.detail(id ?? ""),
    queryFn: () => getSession(id),
    enabled: !!id,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    // Session was deleted/pruned server-side (or the id never existed) — bounce
    // to the ephemeral "new chat" screen rather than "/", which would otherwise
    // eagerly create yet another empty session.
    if (!isSessionLoading && sessionData === null) router.replace("/chat/new");
  }, [isSessionLoading, sessionData, router]);

  if (isSessionLoading || !sessionData) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <IconButton
          icon="menu"
          onPress={() => navigation.openDrawer()}
          accessibilityLabel="Open menu"
          className="absolute left-1"
          style={{ top: insets.top }}
        />
        <ActivityIndicator />
      </View>
    );
  }

  // key remounts the loaded screen (resetting its local state) when navigating
  // between different chat sessions.
  return <LoadedChatScreen key={sessionData.id} chatId={sessionData.id} initialSession={sessionData} />;
}
