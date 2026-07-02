import { View, Text } from "react-native";

export default function AboutScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-lg font-semibold text-gray-800">FAQ RAG</Text>
      <Text className="mt-2 text-sm text-gray-500">AI-powered document Q&amp;A</Text>
    </View>
  );
}
