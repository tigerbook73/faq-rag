import { View, Text } from "react-native";
import { Stack } from "expo-router";
import Constants from "expo-constants";
import { useProvider, PROVIDER_LABEL, PROVIDERS } from "../context/provider-context";

export default function AboutScreen() {
  const { provider } = useProvider();

  return (
    <View className="flex-1 bg-white dark:bg-gray-950">
      <Stack.Screen options={{ headerShown: true, title: "About", headerBackTitle: "Back" }} />

      <View className="items-center px-6 pt-10">
        <Text className="text-lg font-semibold text-gray-800 dark:text-gray-200">FAQ RAG</Text>
        <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">AI-powered document Q&amp;A</Text>
        <Text className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Version {Constants.expoConfig?.version ?? "—"}
        </Text>
      </View>

      <Text className="mt-8 px-6 text-center text-sm text-gray-500 dark:text-gray-400">
        A single-user FAQ question-answering system. Upload documents in Chinese or English, ask questions in either
        language, and get streamed answers with cited source chunks.
      </Text>

      <View className="mt-10 border-t border-gray-100 px-6 pt-4 dark:border-gray-800">
        <Text className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">LLM Provider</Text>
        {PROVIDERS.map((p) => (
          <View key={p} className="flex-row items-center justify-between py-2.5">
            <Text
              className={`text-sm ${
                p === provider ? "font-semibold text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"
              }`}
            >
              {PROVIDER_LABEL[p]}
            </Text>
            {p === provider && <Text className="text-xs text-blue-600 dark:text-blue-400">Current</Text>}
          </View>
        ))}
      </View>
    </View>
  );
}
