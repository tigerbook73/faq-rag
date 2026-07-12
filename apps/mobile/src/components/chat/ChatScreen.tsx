import { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { KeyboardAvoidingView, useKeyboardState } from "react-native-keyboard-controller";
import { useNavigation } from "expo-router";
import type { DrawerNavigationProp } from "expo-router/drawer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import type { Citation, Message } from "@faq-rag/shared";
import type { ChatSession } from "@/lib/api/session";
import { setLastChat, getDraft, setDraft } from "@/lib/api/storage";
import { ChatEmptyState } from "./ChatEmptyState";
import { MessageBubble } from "./MessageBubble";
import { CitationSheet } from "./CitationSheet";
import { ProviderSheet } from "./ProviderSheet";
import { IconButton } from "@/components/ui/icon-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useProviderStore, PROVIDER_LABEL } from "@/stores/provider-store";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import { useChatSessions } from "@/hooks/useChatSessions";
import { useThemeColors } from "@/hooks/useThemeColors";

// This screen is a direct child of the (drawer) group's Drawer navigator;
// useNavigation()'s generic type doesn't know that, so this only narrows to
// the drawer-specific method (openDrawer) that's actually available at runtime.
type ChatDrawerNavigation = DrawerNavigationProp<Record<string, object | undefined>>;

// Shared by app/(drawer)/chat/[id].tsx (existing session) and
// app/(drawer)/chat/new.tsx (chatId=null, ephemeral — nothing is persisted
// server-side until the first message is sent, mirroring apps/web's /chat/new).
export function LoadedChatScreen({
  chatId,
  initialSession,
}: {
  chatId: string | null;
  initialSession: ChatSession | null;
}) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const provider = useProviderStore((state) => state.provider);
  const setProvider = useProviderStore((state) => state.setProvider);
  const navigation = useNavigation<ChatDrawerNavigation>();
  const { handleNew } = useChatSessions();

  const [session, setSession] = useState<ChatSession | null>(initialSession);
  const [messages, setMessages] = useState<Message[]>(initialSession?.messages ?? []);
  const [input, setInput] = useState("");
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [providerSheetVisible, setProviderSheetVisible] = useState(false);
  // When the keyboard is open it already sits flush with the screen bottom,
  // so adding the safe-area inset on top of it doubles up as dead space
  // between the input row and the keyboard.
  const isKeyboardVisible = useKeyboardState((state) => state.isVisible);

  const citationSheetRef = useRef<BottomSheetModal>(null);

  const { loading, send } = useStreamingChat({ chatId, messages, setMessages, session, setSession, provider });

  useEffect(() => {
    if (chatId) void setLastChat(chatId);
  }, [chatId]);

  // Draft is keyed by chatId, falling back to "new" for the not-yet-created
  // chat (mirrors apps/web's STORAGE_KEYS.DRAFT(chatId ?? "new")).
  const draftKey = chatId ?? "new";

  // Restore / persist the input draft (debounced), keyed per chat. Persisting
  // must wait for the restore to settle: the initial empty input would
  // otherwise schedule a setDraft("") (a key delete) that races the async read
  // and can wipe the stored draft.
  const [restoredDraftKey, setRestoredDraftKey] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void getDraft(draftKey)
      .then((draft) => {
        if (!cancelled) setInput(draft);
      })
      .finally(() => {
        if (!cancelled) setRestoredDraftKey(draftKey);
      });
    return () => {
      cancelled = true;
    };
  }, [draftKey]);

  useEffect(() => {
    if (restoredDraftKey !== draftKey) return;
    const timer = setTimeout(() => void setDraft(draftKey, input), 300);
    return () => clearTimeout(timer);
  }, [draftKey, input, restoredDraftKey]);

  const sendQuestion = useCallback(
    (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || loading) return;
      setInput("");
      void setDraft(draftKey, "");
      void send(trimmed);
    },
    [loading, draftKey, send],
  );

  const handleSend = useCallback(() => sendQuestion(input), [input, sendQuestion]);

  const handleCitationClick = useCallback((c: Citation) => {
    setSelectedCitation(c);
    citationSheetRef.current?.present();
  }, []);

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader>
        <IconButton icon="menu" onPress={() => navigation.openDrawer()} accessibilityLabel="Open menu" size={26} />
        <Text numberOfLines={1} className="flex-1 px-1 text-center text-base font-semibold text-foreground">
          {session?.title ?? "Chat"}
        </Text>
        <Pressable
          onPress={() => setProviderSheetVisible(true)}
          className="mr-1 rounded-lg border border-border px-2.5 py-2"
          testID="provider-button"
        >
          <Text className="text-xs font-medium text-muted-foreground">{PROVIDER_LABEL[provider]}</Text>
        </Pressable>
        <IconButton icon="create-outline" onPress={() => void handleNew()} accessibilityLabel="New chat" size={26} />
      </ScreenHeader>

      {/* react-native-keyboard-controller's KeyboardAvoidingView only accepts
          `style`, not NativeWind's `className` — it isn't registered for
          cssInterop, so className="flex-1" would silently no-op and let this
          collapse to content height instead of filling the screen. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        {messages.length === 0 ? (
          <ChatEmptyState onSend={sendQuestion} />
        ) : (
          <FlashList
            data={messages}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={{ padding: 16 }}
            maintainVisibleContentPosition={{ startRenderingFromBottom: true, autoscrollToBottomThreshold: 0.2 }}
            renderItem={({ item, index }) => (
              <MessageBubble
                role={item.role}
                content={item.content}
                citations={item.citations}
                onCitationClick={handleCitationClick}
                isLoading={loading && index === messages.length - 1 && item.role === "assistant"}
              />
            )}
          />
        )}

        <View
          className="flex-row items-end gap-2 border-t border-border-muted px-4 pt-2"
          style={{ paddingBottom: isKeyboardVisible ? 8 : Math.max(insets.bottom, 8) }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask a question…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            className="max-h-32 min-h-14 flex-1 rounded-xl border border-border px-3 py-2 text-sm text-foreground"
            editable={!loading}
            testID="chat-input"
          />
          <Pressable
            onPress={handleSend}
            disabled={loading || !input.trim()}
            className={`h-14 w-14 items-center justify-center rounded-full ${
              loading || !input.trim() ? "bg-border" : "bg-primary"
            }`}
            testID="chat-send"
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Ionicons name="arrow-up" size={20} color={colors.onPrimary} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <CitationSheet ref={citationSheetRef} citation={selectedCitation} />
      <ProviderSheet
        visible={providerSheetVisible}
        current={provider}
        onSelect={setProvider}
        onClose={() => setProviderSheetVisible(false)}
      />
    </View>
  );
}
