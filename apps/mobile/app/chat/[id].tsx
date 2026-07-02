import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-base text-gray-600">Chat {id}</Text>
    </View>
  );
}
