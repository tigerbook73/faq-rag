import { View, Text } from "react-native";

export default function AboutScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-950">
      <Text className="text-lg font-semibold text-gray-800 dark:text-gray-200">FAQ RAG</Text>
      <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">AI-powered document Q&amp;A</Text>
    </View>
  );
}
