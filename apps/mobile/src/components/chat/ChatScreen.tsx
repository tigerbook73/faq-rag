import { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator } from "react-native";
import { KeyboardAvoidingView, useKeyboardState } from "react-native-keyboard-controller";
import { useNavigation } from "expo-router";
import type { DrawerNavigationProp } from "expo-router/drawer";
import { useColorScheme } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import type { Citation, Message } from "@faq-rag/shared";
import type { ChatSession } from "../../lib/api/session";
import { setLastChat, getDraft, setDraft } from "../../lib/api/storage";
import { MessageBubble } from "./MessageBubble";
import { CitationSheet } from "./CitationSheet";
import { ProviderSheet } from "./ProviderSheet";
import { IconButton } from "../ui/icon-button";
import { ScreenHeader } from "../ui/screen-header";
import { useProvider, PROVIDER_LABEL } from "../../context/provider-context";
import { useStreamingChat } from "../../hooks/useStreamingChat";
import { useChatSessions } from "../../hooks/useChatSessions";

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
  const { colorScheme } = useColorScheme();
  const { provider, setProvider } = useProvider();
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

  const listRef = useRef<FlatList<Message>>(null);
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
  const [draftRestored, setDraftRestored] = useState(false);
  useEffect(() => {
    void getDraft(draftKey)
      .then((draft) => {
        if (draft) setInput((current) => current || draft);
      })
      .finally(() => setDraftRestored(true));
  }, [draftKey]);

  useEffect(() => {
    if (!draftRestored) return;
    const timer = setTimeout(() => void setDraft(draftKey, input), 300);
    return () => clearTimeout(timer);
  }, [draftKey, input, draftRestored]);

  const handleSend = useCallback(() => {
    const question = input.trim();
    if (!question || loading) return;
    setInput("");
    void setDraft(draftKey, "");
    void send(question);
  }, [input, loading, draftKey, send]);

  const handleCitationClick = useCallback((c: Citation) => {
    setSelectedCitation(c);
    citationSheetRef.current?.present();
  }, []);

  const scrollToEnd = useCallback(() => {
    // animated: false — this fires on every streamed content-size change, and
    // overlapping animated scrolls thrash the animator and fight user scroll.
    listRef.current?.scrollToEnd({ animated: false });
  }, []);

  return (
    <View className="flex-1 bg-white dark:bg-gray-950">
      <ScreenHeader>
        <IconButton icon="menu" onPress={() => navigation.openDrawer()} accessibilityLabel="Open menu" size={26} />
        <Text
          numberOfLines={1}
          className="flex-1 px-1 text-center text-base font-semibold text-gray-900 dark:text-gray-100"
        >
          {session?.title ?? "Chat"}
        </Text>
        <Pressable
          onPress={() => setProviderSheetVisible(true)}
          className="mr-1 rounded-lg border border-gray-200 px-2.5 py-2 dark:border-gray-700"
          testID="provider-button"
        >
          <Text className="text-xs font-medium text-gray-700 dark:text-gray-300">{PROVIDER_LABEL[provider]}</Text>
        </Pressable>
        <IconButton icon="create-outline" onPress={() => void handleNew()} accessibilityLabel="New chat" size={26} />
      </ScreenHeader>

      <KeyboardAvoidingView className="flex-1" behavior="padding">
        {messages.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons
              name="chatbubbles-outline"
              size={40}
              color={colorScheme === "dark" ? "#4b5563" : "#9ca3af"}
              style={{ marginBottom: 12 }}
            />
            <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
              Ask a question about your documents
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={{ padding: 16 }}
            onContentSizeChange={scrollToEnd}
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
          className="flex-row items-end gap-2 border-t border-gray-100 px-4 pt-2 dark:border-gray-800"
          style={{ paddingBottom: isKeyboardVisible ? 8 : Math.max(insets.bottom, 8) }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask a question…"
            placeholderTextColor={colorScheme === "dark" ? "#6b7280" : "#9ca3af"}
            multiline
            className="max-h-32 min-h-14 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:text-gray-100"
            editable={!loading}
            testID="chat-input"
          />
          <Pressable
            onPress={handleSend}
            disabled={loading || !input.trim()}
            className={`h-14 w-14 items-center justify-center rounded-full ${
              loading || !input.trim() ? "bg-gray-300 dark:bg-gray-700" : "bg-blue-600"
            }`}
            testID="chat-send"
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="arrow-up" size={20} color="#fff" />
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
