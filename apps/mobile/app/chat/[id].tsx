import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useSWR from "swr";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import type { Citation, Message } from "@faq-rag/shared";
import { getSession, type ChatSession } from "../../src/lib/api/session";
import { setLastChat, getDraft, setDraft } from "../../src/lib/api/storage";
import { MessageBubble } from "../../src/components/chat/MessageBubble";
import { CitationSheet } from "../../src/components/chat/CitationSheet";
import { ProviderSheet } from "../../src/components/chat/ProviderSheet";
import { useProvider, PROVIDER_LABEL } from "../../src/context/provider-context";
import { useStreamingChat } from "../../src/hooks/useStreamingChat";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: sessionData, isLoading: isSessionLoading } = useSWR<ChatSession | null>(
    id ? `/api/sessions/${id}` : null,
    () => getSession(id),
    { revalidateOnFocus: false, revalidateOnReconnect: false, revalidateIfStale: false },
  );

  useEffect(() => {
    // Session was deleted/pruned server-side; go back to the list.
    if (!isSessionLoading && sessionData === null) router.replace("/chats");
  }, [isSessionLoading, sessionData, router]);

  if (isSessionLoading || !sessionData) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Stack.Screen options={{ headerShown: true, title: "Chat" }} />
        <ActivityIndicator />
      </View>
    );
  }

  // key remounts the loaded screen (resetting its local state) when navigating
  // between different chat sessions.
  return <LoadedChatScreen key={sessionData.id} chatId={sessionData.id} initialSession={sessionData} />;
}

function LoadedChatScreen({ chatId, initialSession }: { chatId: string; initialSession: ChatSession }) {
  const insets = useSafeAreaInsets();
  const { provider, setProvider } = useProvider();

  const [session, setSession] = useState<ChatSession | null>(initialSession);
  const [messages, setMessages] = useState<Message[]>(initialSession.messages);
  const [input, setInput] = useState("");
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [providerSheetVisible, setProviderSheetVisible] = useState(false);

  const listRef = useRef<FlatList<Message>>(null);
  const citationSheetRef = useRef<BottomSheetModal>(null);

  const { loading, send } = useStreamingChat({ chatId, messages, setMessages, session, setSession, provider });

  useEffect(() => {
    void setLastChat(chatId);
  }, [chatId]);

  // Restore / persist the input draft (debounced), keyed per chat. Persisting
  // must wait for the restore to settle: the initial empty input would
  // otherwise schedule a setDraft("") (a key delete) that races the async read
  // and can wipe the stored draft.
  const [draftRestored, setDraftRestored] = useState(false);
  useEffect(() => {
    void getDraft(chatId)
      .then((draft) => {
        if (draft) setInput((current) => current || draft);
      })
      .finally(() => setDraftRestored(true));
  }, [chatId]);

  useEffect(() => {
    if (!draftRestored) return;
    const timer = setTimeout(() => void setDraft(chatId, input), 300);
    return () => clearTimeout(timer);
  }, [chatId, input, draftRestored]);

  const handleSend = useCallback(() => {
    const question = input.trim();
    if (!question || loading) return;
    setInput("");
    void setDraft(chatId, "");
    void send(question);
  }, [input, loading, chatId, send]);

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
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          headerShown: true,
          title: session?.title ?? "Chat",
          headerBackTitle: "Chats",
          headerRight: () => (
            <Pressable
              onPress={() => setProviderSheetVisible(true)}
              className="rounded-lg border border-gray-200 px-2.5 py-1"
              testID="provider-button"
            >
              <Text className="text-xs font-medium text-gray-700">{PROVIDER_LABEL[provider]}</Text>
            </Pressable>
          ),
        }}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        {messages.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-center text-sm text-gray-500">Ask a question about your documents</Text>
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
          className="flex-row items-end gap-2 border-t border-gray-100 px-4 pt-2"
          style={{ paddingBottom: Math.max(insets.bottom, 8) }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask a question…"
            placeholderTextColor="#9ca3af"
            multiline
            className="max-h-32 min-h-10 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900"
            editable={!loading}
            testID="chat-input"
          />
          <Pressable
            onPress={handleSend}
            disabled={loading || !input.trim()}
            className={`rounded-xl px-4 py-2.5 ${loading || !input.trim() ? "bg-gray-300" : "bg-blue-600"}`}
            testID="chat-send"
          >
            <Text className="text-sm font-medium text-white">{loading ? "…" : "Send"}</Text>
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
