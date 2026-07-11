import { ScrollView, StyleSheet, View, Text } from "react-native";
import { Stack, useRouter } from "expo-router";
import Constants from "expo-constants";
import Markdown from "react-native-markdown-display";
import { useColorScheme } from "nativewind";
import { useProviderStore, PROVIDER_LABEL, PROVIDERS } from "@/stores/provider-store";
import { IconButton } from "@/components/ui/icon-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import aboutContent from "@/content/about.md";
import { light, dark } from "@/lib/theme/colors";

const markdownStyleLight = StyleSheet.create({
  body: { color: light.mutedForeground, fontSize: 14, lineHeight: 21 },
  heading2: { color: light.foreground, fontSize: 16, lineHeight: 24, marginBottom: 4 },
  paragraph: { marginTop: 0, marginBottom: 12 },
});

const markdownStyleDark = StyleSheet.create({
  body: { color: dark.mutedForeground, fontSize: 14, lineHeight: 21 },
  heading2: { color: dark.foreground, fontSize: 16, lineHeight: 24, marginBottom: 4 },
  paragraph: { marginTop: 0, marginBottom: 12 },
});

export default function AboutScreen() {
  const provider = useProviderStore((state) => state.provider);
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const markdownStyle = colorScheme === "dark" ? markdownStyleDark : markdownStyleLight;

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: "About", animation: "none" }} />

      <ScreenHeader>
        <IconButton
          icon="chevron-back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          accessibilityLabel="Go back"
          size={26}
        />
        <Text numberOfLines={1} className="flex-1 px-1 text-center text-base font-semibold text-foreground">
          About
        </Text>
        <View className="h-10 w-10" />
      </ScreenHeader>

      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        <View className="items-center px-6 pt-10">
          <Text className="text-lg font-semibold text-foreground">FAQ RAG</Text>
          <Text className="mt-2 text-sm text-muted-foreground">AI-powered document Q&amp;A</Text>
          <Text className="mt-1 text-xs text-subtle-foreground">Version {Constants.expoConfig?.version ?? "—"}</Text>
        </View>

        <View className="mt-8 px-6">
          <Markdown style={markdownStyle}>{aboutContent}</Markdown>
        </View>

        <View className="mt-6 border-t border-border-muted px-6 pt-4">
          <Text className="text-xs font-medium uppercase text-subtle-foreground">LLM Provider</Text>
          {PROVIDERS.map((p) => (
            <View key={p} className="flex-row items-center justify-between py-2.5">
              <Text
                className={`text-sm ${p === provider ? "font-semibold text-primary-text" : "text-muted-foreground"}`}
              >
                {PROVIDER_LABEL[p]}
              </Text>
              {p === provider && <Text className="text-xs text-primary-text">Current</Text>}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
