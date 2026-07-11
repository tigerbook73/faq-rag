import { View, Text } from "react-native";
import { Stack, useRouter } from "expo-router";
import Constants from "expo-constants";
import { useProviderStore, PROVIDER_LABEL, PROVIDERS } from "../stores/provider-store";
import { IconButton } from "../components/ui/icon-button";
import { ScreenHeader } from "../components/ui/screen-header";

export default function AboutScreen() {
  const provider = useProviderStore((state) => state.provider);
  const router = useRouter();

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: "About", animation: "none" }} />

      <ScreenHeader>
        <IconButton icon="chevron-back" onPress={() => router.back()} accessibilityLabel="Go back" size={26} />
        <Text numberOfLines={1} className="flex-1 px-1 text-center text-base font-semibold text-foreground">
          About
        </Text>
        <View className="h-10 w-10" />
      </ScreenHeader>

      <View className="items-center px-6 pt-10">
        <Text className="text-lg font-semibold text-foreground">FAQ RAG</Text>
        <Text className="mt-2 text-sm text-muted-foreground">AI-powered document Q&amp;A</Text>
        <Text className="mt-1 text-xs text-subtle-foreground">Version {Constants.expoConfig?.version ?? "—"}</Text>
      </View>

      <Text className="mt-8 px-6 text-center text-sm text-muted-foreground">
        A single-user FAQ question-answering system. Upload documents in Chinese or English, ask questions in either
        language, and get streamed answers with cited source chunks.
      </Text>

      <View className="mt-10 border-t border-border-muted px-6 pt-4">
        <Text className="text-xs font-medium uppercase text-subtle-foreground">LLM Provider</Text>
        {PROVIDERS.map((p) => (
          <View key={p} className="flex-row items-center justify-between py-2.5">
            <Text className={`text-sm ${p === provider ? "font-semibold text-primary-text" : "text-muted-foreground"}`}>
              {PROVIDER_LABEL[p]}
            </Text>
            {p === provider && <Text className="text-xs text-primary-text">Current</Text>}
          </View>
        ))}
      </View>
    </View>
  );
}
