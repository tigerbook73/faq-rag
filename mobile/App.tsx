import "react-native-url-polyfill/auto";

import { useEffect, useMemo, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import * as SecureStore from "expo-secure-store";
import { createClient, type Session } from "@supabase/supabase-js";
import {
  DEFAULT_PROVIDER,
  PROVIDER,
  PROVIDER_LABEL,
  type ChatRequestInput,
  type Provider,
} from "@faq-rag/shared";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
const defaultApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";
const defaultProvider =
  process.env.EXPO_PUBLIC_DEFAULT_PROVIDER &&
  Object.values(PROVIDER).includes(process.env.EXPO_PUBLIC_DEFAULT_PROVIDER as Provider)
    ? (process.env.EXPO_PUBLIC_DEFAULT_PROVIDER as Provider)
    : DEFAULT_PROVIDER;

const nativeSecureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const webStorage = {
  getItem: (key: string) => Promise.resolve(typeof window === "undefined" ? null : window.localStorage.getItem(key)),
  setItem: (key: string, value: string) => {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
    return Promise.resolve();
  },
};

const supabase = createClient(supabaseUrl || "http://localhost:54321", supabaseAnonKey || "missing-anon-key", {
  auth: {
    storage: Platform.OS === "web" ? webStorage : nativeSecureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("admin@test.com");
  const [password, setPassword] = useState("admin@123");
  const [apiBaseUrl, setApiBaseUrl] = useState(defaultApiBaseUrl);
  const [provider, setProvider] = useState<Provider>(defaultProvider);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const missingConfig = !supabaseUrl || !supabaseAnonKey;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const history = useMemo(
    () => messages.map((message) => ({ role: message.role, content: message.content })),
    [messages],
  );

  async function signIn() {
    setPending(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (authError) setError(authError.message);
  }

  async function signOut() {
    setPending(true);
    setError(null);
    await supabase.auth.signOut();
    setMessages([]);
    setPending(false);
  }

  async function sendMessage() {
    const trimmed = question.trim();
    if (!trimmed || pending || !session) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setQuestion("");
    setPending(true);
    setError(null);

    try {
      const activeSession = await getFreshSession();
      if (!activeSession) throw new Error("Not signed in");

      const body: ChatRequestInput = {
        question: trimmed,
        provider,
        history,
      };

      const res = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeSession.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`API ${res.status}${detail ? `: ${detail}` : ""}`);
      }

      const text = await res.text();
      const answer = parseChatStream(text);
      setMessages([...nextMessages, { role: "assistant", content: answer || "No answer returned." }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setMessages(nextMessages);
    } finally {
      setPending(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  }

  async function getFreshSession() {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;
    const refreshed = await supabase.auth.refreshSession();
    return refreshed.data.session;
  }

  if (authLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator />
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  if (missingConfig) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.panel}>
          <Text style={styles.title}>FAQ-RAG Demo</Text>
          <Text style={styles.errorText}>Missing Expo Supabase environment variables.</Text>
          <Text style={styles.helperText}>Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.</Text>
        </View>
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
          <View style={styles.panel}>
            <Text style={styles.title}>FAQ-RAG Demo</Text>
            <Text style={styles.label}>API base URL</Text>
            <TextInput
              value={apiBaseUrl}
              onChangeText={setApiBaseUrl}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <Text style={styles.label}>Password</Text>
            <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <ActionButton label="Sign in" disabled={pending} onPress={signIn} />
          </View>
        </KeyboardAvoidingView>
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>FAQ-RAG</Text>
            <Text style={styles.helperText}>{session.user.email}</Text>
          </View>
          <Pressable disabled={pending} onPress={signOut} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Sign out</Text>
          </Pressable>
        </View>

        <View style={styles.providerRow}>
          {Object.values(PROVIDER).map((item) => (
            <Pressable
              key={item}
              onPress={() => setProvider(item)}
              style={[styles.providerButton, provider === item && styles.providerButtonActive]}
            >
              <Text style={[styles.providerText, provider === item && styles.providerTextActive]}>
                {PROVIDER_LABEL[item]}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? <Text style={styles.emptyText}>Ask a question about your knowledge base.</Text> : null}
          {messages.map((message, index) => (
            <View
              key={`${message.role}-${index}`}
              style={[styles.bubble, message.role === "user" ? styles.userBubble : styles.assistantBubble]}
            >
              <Text style={[styles.messageText, message.role === "user" && styles.userMessageText]}>
                {message.content}
              </Text>
            </View>
          ))}
        </ScrollView>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.composer}>
          <TextInput
            value={question}
            onChangeText={setQuestion}
            multiline
            placeholder="Ask a question"
            placeholderTextColor="#6b7280"
            style={styles.composerInput}
          />
          <ActionButton label={pending ? "..." : "Send"} disabled={pending || !question.trim()} onPress={sendMessage} />
        </View>
      </KeyboardAvoidingView>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

function ActionButton({ label, disabled, onPress }: { label: string; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.primaryButton, disabled && styles.buttonDisabled]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function parseChatStream(text: string) {
  let answer = "";
  let streamError: string | null = null;
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("data: ")) continue;
    try {
      const payload = JSON.parse(line.slice(6)) as { type?: string; token?: string; answer?: string; message?: string };
      if (payload.type === "done") answer = payload.answer ?? answer;
      if (payload.type === "token" && !answer) answer += payload.token ?? "";
      if (payload.type === "error") streamError = payload.message ?? "Chat API error";
    } catch {
      continue;
    }
  }
  if (streamError) throw new Error(streamError);
  return answer.trim();
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  keyboard: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  panel: {
    margin: 20,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#cbd5e1",
    backgroundColor: "#ffffff",
  },
  title: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "700",
  },
  helperText: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    color: "#0f172a",
    fontSize: 16,
  },
  providerRow: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    backgroundColor: "#ffffff",
  },
  providerButton: {
    minHeight: 36,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },
  providerButtonActive: {
    borderColor: "#0f172a",
    backgroundColor: "#0f172a",
  },
  providerText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "600",
  },
  providerTextActive: {
    color: "#ffffff",
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    gap: 12,
    padding: 16,
  },
  emptyText: {
    marginTop: 24,
    textAlign: "center",
    color: "#64748b",
    fontSize: 16,
  },
  bubble: {
    maxWidth: "88%",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#0f172a",
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#e2e8f0",
  },
  messageText: {
    color: "#0f172a",
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: "#ffffff",
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#cbd5e1",
    backgroundColor: "#ffffff",
  },
  composerInput: {
    minHeight: 44,
    maxHeight: 120,
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#0f172a",
    fontSize: 16,
  },
  primaryButton: {
    minHeight: 44,
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#0f172a",
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 4,
  },
});
